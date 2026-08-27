// Firestore security-rules test suite for the Rotech Location Readiness
// Platform. Runs against the Firestore emulator — no production data involved.
//
// The point of these tests is the read-isolation boundary: prove that a user
// in one location/area/region cannot read another's assessments, comments or
// corrective action logs, and that the paths people legitimately need still
// work.

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import {
  doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs,
} from 'firebase/firestore';

const RULES = readFileSync(
  new URL('../firestore.rules', import.meta.url),
  'utf8'
);

const testEnv = await initializeTestEnvironment({
  projectId: 'rotech-rules-test',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});

// ---------------------------------------------------------------------------
// Fixture: two regions, two areas, three locations.
//   R1 / A1 / loc-100  <- lm100, am1, ra1
//   R1 / A2 / loc-200  <- am2
//   R2 / A3 / loc-300  <- lm300, ra2
// ---------------------------------------------------------------------------
const USERS = {
  lm100: { email: 'lm100@rotech.com', role: 'locationManager', locationId: 'loc-100', areaId: 'A1', regionId: 'R1' },
  lm300: { email: 'lm300@rotech.com', role: 'locationManager', locationId: 'loc-300', areaId: 'A3', regionId: 'R2' },
  am1:   { email: 'am1@rotech.com',   role: 'areaManager',     locationId: null,      areaId: 'A1', regionId: 'R1' },
  am2:   { email: 'am2@rotech.com',   role: 'areaManager',     locationId: null,      areaId: 'A2', regionId: 'R1' },
  ra1:   { email: 'ra1@rotech.com',   role: 'regionAdmin',     locationId: null,      areaId: null, regionId: 'R1' },
  ra2:   { email: 'ra2@rotech.com',   role: 'regionAdmin',     locationId: null,      areaId: null, regionId: 'R2' },
  spec:  { email: 'spec@rotech.com',  role: 'accreditationSpecialist', locationId: null, areaId: null, regionId: null },
};

const LOCATIONS = {
  'loc-100': { lawsonNumber: 'loc-100', name: 'Alpha',   areaId: 'A1', regionId: 'R1' },
  'loc-200': { lawsonNumber: 'loc-200', name: 'Bravo',   areaId: 'A2', regionId: 'R1' },
  'loc-300': { lawsonNumber: 'loc-300', name: 'Charlie', areaId: 'A3', regionId: 'R2' },
};

function scopedDoc(locationId, extra = {}) {
  const loc = LOCATIONS[locationId];
  return { locationId, areaId: loc.areaId, regionId: loc.regionId, quarter: 'Q1-Q2 2026', ...extra };
}

await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (const [uid, data] of Object.entries(USERS)) await setDoc(doc(db, 'users', uid), data);
  for (const [id, data] of Object.entries(LOCATIONS)) await setDoc(doc(db, 'locations', id), data);

  // One submitted assessment per location, JC427 (the personnel-data form).
  for (const id of Object.keys(LOCATIONS)) {
    await setDoc(doc(db, 'assessments', `a-${id}`), scopedDoc(id, {
      assessmentType: 'JC427',
      status: 'submitted',
      employees: [{ name: 'Jane Doe', jobTitle: 'RT', hireDate: '2020-01-01' }],
    }));
    await setDoc(doc(db, 'submission_comments', `c-${id}`), scopedDoc(id, {
      assessmentId: `a-${id}`,
      assessmentType: 'JC427',
      authorEmail: 'spec@rotech.com',
      authorRole: 'accreditationSpecialist',
      text: 'finding text',
    }));
    await setDoc(doc(db, 'corrective_action_logs', `k-${id}`), scopedDoc(id, {
      assessmentId: `a-${id}`,
      assessmentType: 'JC427',
      authorEmail: 'spec@rotech.com',
      authorRole: 'accreditationSpecialist',
      sectionKey: 's1',
      text: 'corrective action',
    }));
  }
});

function as(uid) {
  return testEnv.authenticatedContext(uid, { email: USERS[uid].email }).firestore();
}
const anon = () => testEnv.unauthenticatedContext().firestore();

// ---------------------------------------------------------------------------
let passed = 0, failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${name}\n          ${String(err).split('\n')[0]}`);
  }
}

console.log('\n== Unauthenticated access ==');
await check('anonymous cannot read an assessment', () =>
  assertFails(getDoc(doc(anon(), 'assessments', 'a-loc-100'))));
await check('anonymous cannot read a comment', () =>
  assertFails(getDoc(doc(anon(), 'submission_comments', 'c-loc-100'))));
await check('anonymous cannot list assessments', () =>
  assertFails(getDocs(collection(anon(), 'assessments'))));
await check('anonymous cannot read the location roster', () =>
  assertFails(getDoc(doc(anon(), 'locations', 'loc-100'))));

console.log('\n== Authenticated identity with no user profile ==');
await check('signed-in stranger with no users/{uid} doc reads nothing', async () => {
  const db = testEnv.authenticatedContext('stranger', { email: 'attacker@example.com' }).firestore();
  await assertFails(getDoc(doc(db, 'assessments', 'a-loc-100')));
  await assertFails(getDocs(collection(db, 'assessments')));
  await assertFails(getDoc(doc(db, 'locations', 'loc-100')));
});

console.log('\n== Location Manager scope ==');
await check('reads own location assessment', () =>
  assertSucceeds(getDoc(doc(as('lm100'), 'assessments', 'a-loc-100'))));
await check('CANNOT read another location assessment (JC427 personnel data)', () =>
  assertFails(getDoc(doc(as('lm100'), 'assessments', 'a-loc-300'))));
await check('CANNOT list assessments unfiltered', () =>
  assertFails(getDocs(collection(as('lm100'), 'assessments'))));
await check('CANNOT query another location', () =>
  assertFails(getDocs(query(collection(as('lm100'), 'assessments'), where('locationId', '==', 'loc-300')))));
await check('CANNOT widen to their whole region', () =>
  assertFails(getDocs(query(collection(as('lm100'), 'assessments'), where('regionId', '==', 'R1')))));
await check('own scoped query succeeds', () =>
  assertSucceeds(getDocs(query(
    collection(as('lm100'), 'assessments'),
    where('locationId', '==', 'loc-100'),
    where('quarter', '==', 'Q1-Q2 2026')))));
await check('CANNOT read another location comment', () =>
  assertFails(getDoc(doc(as('lm100'), 'submission_comments', 'c-loc-300'))));
await check('CANNOT read another location corrective action log', () =>
  assertFails(getDoc(doc(as('lm100'), 'corrective_action_logs', 'k-loc-300'))));

console.log('\n== Area Manager scope ==');
await check('reads assessment in own area', () =>
  assertSucceeds(getDoc(doc(as('am1'), 'assessments', 'a-loc-100'))));
await check('CANNOT read assessment in a sibling area of the same region', () =>
  assertFails(getDoc(doc(as('am1'), 'assessments', 'a-loc-200'))));
await check('CANNOT read assessment in another region', () =>
  assertFails(getDoc(doc(as('am1'), 'assessments', 'a-loc-300'))));
await check('own-area query succeeds', () =>
  assertSucceeds(getDocs(query(
    collection(as('am1'), 'assessments'),
    where('areaId', '==', 'A1'),
    where('quarter', '==', 'Q1-Q2 2026')))));
await check('CANNOT query a sibling area', () =>
  assertFails(getDocs(query(collection(as('am1'), 'assessments'), where('areaId', '==', 'A2')))));
await check('CANNOT list assessments unfiltered', () =>
  assertFails(getDocs(collection(as('am1'), 'assessments'))));

console.log('\n== Region Admin scope ==');
await check('reads both areas of own region', async () => {
  await assertSucceeds(getDoc(doc(as('ra1'), 'assessments', 'a-loc-100')));
  await assertSucceeds(getDoc(doc(as('ra1'), 'assessments', 'a-loc-200')));
});
await check('CANNOT read another region', () =>
  assertFails(getDoc(doc(as('ra1'), 'assessments', 'a-loc-300'))));
await check('own-region query succeeds', () =>
  assertSucceeds(getDocs(query(collection(as('ra1'), 'assessments'), where('regionId', '==', 'R1')))));
await check('CANNOT query another region', () =>
  assertFails(getDocs(query(collection(as('ra1'), 'assessments'), where('regionId', '==', 'R2')))));
await check('CANNOT list assessments unfiltered', () =>
  assertFails(getDocs(collection(as('ra1'), 'assessments'))));

console.log('\n== Accreditation Specialist ==');
await check('reads company-wide', async () => {
  await assertSucceeds(getDoc(doc(as('spec'), 'assessments', 'a-loc-100')));
  await assertSucceeds(getDoc(doc(as('spec'), 'assessments', 'a-loc-300')));
});
await check('unfiltered list succeeds', () =>
  assertSucceeds(getDocs(collection(as('spec'), 'assessments'))));

console.log('\n== Writes ==');
await check('location manager submits for own location', () =>
  assertSucceeds(setDoc(doc(as('lm100'), 'assessments', 'new-ok'),
    scopedDoc('loc-100', { assessmentType: 'OP512', status: 'submitted' }))));
await check('location manager CANNOT submit for another location', () =>
  assertFails(setDoc(doc(as('lm100'), 'assessments', 'new-bad'),
    scopedDoc('loc-300', { assessmentType: 'OP512', status: 'submitted' }))));
await check('CANNOT forge scope fields to file into another region', () =>
  assertFails(setDoc(doc(as('lm100'), 'assessments', 'new-forged'), {
    locationId: 'loc-100', areaId: 'A3', regionId: 'R2',
    quarter: 'Q1-Q2 2026', assessmentType: 'OP512', status: 'submitted',
  })));
await check('area manager CANNOT create an assessment', () =>
  assertFails(setDoc(doc(as('am1'), 'assessments', 'new-am'),
    scopedDoc('loc-100', { assessmentType: 'OP512', status: 'submitted' }))));
await check('CANNOT edit a submitted assessment in place', () =>
  assertFails(updateDoc(doc(as('lm100'), 'assessments', 'a-loc-100'), { status: 'submitted', employees: [] })));
await check('CANNOT post a comment as somebody else', () =>
  assertFails(setDoc(doc(as('lm100'), 'submission_comments', 'forged'),
    scopedDoc('loc-100', { assessmentId: 'a-loc-100', assessmentType: 'JC427',
      authorEmail: 'spec@rotech.com', authorRole: 'accreditationSpecialist', text: 'x' }))));
await check('CANNOT post a comment claiming a higher role', () =>
  assertFails(setDoc(doc(as('lm100'), 'submission_comments', 'forged2'),
    scopedDoc('loc-100', { assessmentId: 'a-loc-100', assessmentType: 'JC427',
      authorEmail: 'lm100@rotech.com', authorRole: 'accreditationSpecialist', text: 'x' }))));
await check('posts a legitimate comment on own location', () =>
  assertSucceeds(setDoc(doc(as('lm100'), 'submission_comments', 'ok-comment'),
    scopedDoc('loc-100', { assessmentId: 'a-loc-100', assessmentType: 'JC427',
      authorEmail: 'lm100@rotech.com', authorRole: 'locationManager', text: 'done' }))));

console.log('\n== Privilege escalation ==');
await check('user CANNOT promote themselves to specialist', () =>
  assertFails(updateDoc(doc(as('lm100'), 'users', 'lm100'), { role: 'accreditationSpecialist' })));
await check('user CANNOT move themselves to another region', () =>
  assertFails(updateDoc(doc(as('lm100'), 'users', 'lm100'), { regionId: 'R2' })));
await check('user CANNOT read another user profile', () =>
  assertFails(getDoc(doc(as('lm100'), 'users', 'lm300'))));
await check('location roster is read-only to non-specialists', () =>
  assertFails(setDoc(doc(as('ra1'), 'locations', 'loc-999'), { name: 'rogue', areaId: 'A1', regionId: 'R1' })));

console.log('\n== Invites ==');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const future = new Date(Date.now() + 7 * 864e5);
  const past = new Date(Date.now() - 864e5);
  await setDoc(doc(db, 'invites', 'tok-valid'), {
    email: 'newbie@rotech.com', role: 'locationManager', locationId: 'loc-100',
    areaId: 'A1', regionId: 'R1', status: 'pending', expiresAt: future,
  });
  await setDoc(doc(db, 'invites', 'tok-expired'), {
    email: 'stale@rotech.com', role: 'locationManager', locationId: 'loc-100',
    areaId: 'A1', regionId: 'R1', status: 'pending', expiresAt: past,
  });
});
await check('invites cannot be enumerated anonymously', () =>
  assertFails(getDocs(collection(anon(), 'invites'))));
await check('a known token can still be fetched by the invitee', () =>
  assertSucceeds(getDoc(doc(anon(), 'invites', 'tok-valid'))));
await check('valid invite creates the account profile', () => {
  const db = testEnv.authenticatedContext('newbie', { email: 'newbie@rotech.com' }).firestore();
  return assertSucceeds(setDoc(doc(db, 'users', 'newbie'), {
    email: 'newbie@rotech.com', role: 'locationManager', locationId: 'loc-100',
    areaId: 'A1', regionId: 'R1', inviteToken: 'tok-valid',
  }));
});
await check('EXPIRED invite cannot create an account', () => {
  const db = testEnv.authenticatedContext('stale', { email: 'stale@rotech.com' }).firestore();
  return assertFails(setDoc(doc(db, 'users', 'stale'), {
    email: 'stale@rotech.com', role: 'locationManager', locationId: 'loc-100',
    areaId: 'A1', regionId: 'R1', inviteToken: 'tok-expired',
  }));
});
await check('invite cannot be redeemed for a higher role than issued', () => {
  const db = testEnv.authenticatedContext('newbie2', { email: 'newbie@rotech.com' }).firestore();
  return assertFails(setDoc(doc(db, 'users', 'newbie2'), {
    email: 'newbie@rotech.com', role: 'accreditationSpecialist', locationId: 'loc-100',
    areaId: 'A1', regionId: 'R1', inviteToken: 'tok-valid',
  }));
});
await check('invite cannot be redeemed by a different email', () => {
  const db = testEnv.authenticatedContext('thief', { email: 'thief@example.com' }).firestore();
  return assertFails(setDoc(doc(db, 'users', 'thief'), {
    email: 'thief@example.com', role: 'locationManager', locationId: 'loc-100',
    areaId: 'A1', regionId: 'R1', inviteToken: 'tok-valid',
  }));
});

console.log(`\n${passed} passed, ${failed} failed\n`);
await testEnv.cleanup();
process.exit(failed > 0 ? 1 : 0);
