// Role and data-scope helpers.
//
// Every role-scoped collection (assessments, submission_comments,
// corrective_action_logs) carries all three scope fields — locationId, areaId
// and regionId — denormalized onto each document. That denormalization is what
// makes server-side read isolation possible at all: Firestore evaluates a rule
// against a *query*, not against the documents it would return, so a rule can
// only restrict reads on a field the query itself filters on. Resolving an
// assessment's region through its location with get() works for a single-doc
// read and fails for any list, which is why the scope fields live on the
// documents rather than being looked up.
//
// The pairing to preserve when touching this: every scoped query must filter on
// the field scopeFor() hands back for the signed-in user, and firestore.rules
// must require that same field to match. Drop the client filter and the query
// is rejected outright; loosen the rule and the isolation is gone.

import { doc, getDoc, where } from 'firebase/firestore';
import { db } from './firebase';

export const ROLE_ROUTES = {
  locationManager: '/location-manager',
  areaManager: '/area-manager',
  regionAdmin: '/region-admin',
  accreditationSpecialist: '/accreditation',
};

export const ROLE_LABELS = {
  locationManager: 'Location Manager',
  areaManager: 'Area Manager',
  regionAdmin: 'Region Admin',
  accreditationSpecialist: 'Accreditation Specialist',
};

export function isValidRole(role) {
  return Object.prototype.hasOwnProperty.call(ROLE_ROUTES, role);
}

// Loads the signed-in user's profile. Returns null when no users/{uid} doc
// exists — an authenticated identity with no profile is not a user of this app
// and must not be treated as one (see scopeFor's default branch).
export async function loadProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    email: data.email || '',
    role: data.role || '',
    locationId: data.locationId ?? null,
    areaId: data.areaId ?? null,
    regionId: data.regionId ?? null,
  };
}

// The one field/value pair that scopes this user's reads, or null for the
// Accreditation Specialist, whose remit is company-wide.
//
// The default branch deliberately returns an unmatchable filter rather than
// null: an unrecognised or missing role must read nothing, not everything.
export function scopeFor(profile) {
  switch (profile?.role) {
    case 'accreditationSpecialist':
      return null;
    case 'locationManager':
      return { field: 'locationId', value: profile.locationId };
    case 'areaManager':
      return { field: 'areaId', value: profile.areaId };
    case 'regionAdmin':
      return { field: 'regionId', value: profile.regionId };
    default:
      return { field: 'locationId', value: '__no_scope__' };
  }
}

// Spread into a query() call: query(collection(db, 'assessments'),
// ...scopeClauses(scope), where('quarter', '==', quarter))
export function scopeClauses(scope) {
  return scope ? [where(scope.field, '==', scope.value)] : [];
}

// The scope fields to stamp onto a new scoped document. Written from the
// location the record belongs to, and re-validated server-side in
// firestore.rules against that same locations/{id} doc, so a tampered client
// cannot file a record into someone else's area or region.
export function scopeFields(location) {
  return {
    locationId: location.lawsonNumber,
    areaId: location.areaId ?? null,
    regionId: location.regionId ?? null,
  };
}
