// Backfills areaId / regionId onto every assessments, submission_comments and
// corrective_action_logs document that predates the role-scoped read rules.
//
// WHY THIS IS REQUIRED, AND WHEN TO RUN IT
// ----------------------------------------
// The scoped rules restrict reads to documents whose areaId / regionId matches
// the caller's, and every dashboard query now filters on that field. A document
// written before this change has neither field, so it matches no scoped query:
// it does not error, it simply stops appearing for Area Managers and Region
// Admins. Run this BEFORE deploying the new firestore.rules, so there is never
// a window where existing submissions are invisible to the people who need
// them. Documents are read-modify-written one at a time in batches; assessment
// answers are never touched.
//
// USAGE
//   npm install firebase-admin          # dev-only, not a runtime dependency
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
//     node scripts/backfill-scope-fields.mjs --dry-run
//   ...check the summary, then re-run without --dry-run.
//
// The service-account JSON is a full-access credential: keep it off the repo
// and delete the local copy when the backfill is done.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const DRY_RUN = process.argv.includes('--dry-run');
const SCOPED_COLLECTIONS = ['assessments', 'submission_comments', 'corrective_action_logs'];
const BATCH_LIMIT = 400; // Firestore caps a write batch at 500.

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// locationId on these documents is the Lawson number. locations/{id} is keyed
// by that same value, but fall back to a lawsonNumber lookup for any location
// doc whose id drifted from its Lawson number.
async function buildLocationIndex() {
  const snap = await db.collection('locations').get();
  const byKey = new Map();
  snap.forEach(doc => {
    const data = doc.data();
    const entry = { areaId: data.areaId ?? null, regionId: data.regionId ?? null };
    byKey.set(doc.id, entry);
    if (data.lawsonNumber) byKey.set(String(data.lawsonNumber), entry);
  });
  return byKey;
}

async function backfillCollection(name, locations) {
  const snap = await db.collection(name).get();
  let updated = 0;
  let alreadyScoped = 0;
  let unresolved = [];

  let batch = db.batch();
  let pending = 0;

  for (const doc of snap.docs) {
    const data = doc.data();

    if (data.areaId !== undefined && data.regionId !== undefined) {
      alreadyScoped++;
      continue;
    }

    const location = locations.get(String(data.locationId));
    if (!location) {
      // Do not guess. An unresolved document is reported and left alone so it
      // can be fixed by hand rather than silently filed into the wrong region.
      unresolved.push({ id: doc.id, locationId: data.locationId ?? '(missing)' });
      continue;
    }

    if (!DRY_RUN) {
      batch.update(doc.ref, {
        areaId: location.areaId,
        regionId: location.regionId,
        scopeBackfilledAt: FieldValue.serverTimestamp(),
      });
      pending++;
      if (pending >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }
    updated++;
  }

  if (!DRY_RUN && pending > 0) await batch.commit();

  return { name, total: snap.size, updated, alreadyScoped, unresolved };
}

const locations = await buildLocationIndex();
console.log(`Loaded ${locations.size} location keys.\n`);

let anyUnresolved = false;
for (const name of SCOPED_COLLECTIONS) {
  const r = await backfillCollection(name, locations);
  console.log(
    `${r.name}: ${r.total} docs — ${DRY_RUN ? 'would update' : 'updated'} ${r.updated}, ` +
    `already scoped ${r.alreadyScoped}, unresolved ${r.unresolved.length}`
  );
  for (const u of r.unresolved) {
    anyUnresolved = true;
    console.log(`    ! ${r.name}/${u.id} — no location for locationId "${u.locationId}"`);
  }
}

if (anyUnresolved) {
  console.log(
    '\nUnresolved documents were left unchanged. They reference a location that no ' +
    'longer exists; fix the locationId or recreate the location, then re-run.'
  );
}
console.log(DRY_RUN ? '\nDry run — nothing was written.' : '\nBackfill complete.');
