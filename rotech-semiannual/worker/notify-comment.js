// Rotech Location Readiness Platform — comment notification relay.
//
// Deploy via the Cloudflare dashboard's Worker "Quick Edit" (no build step, no npm deps —
// everything here runs on the Workers runtime's native Web Crypto / fetch APIs). See
// CLOUDFLARE_WORKER_SETUP.md in the repo root for the full setup + required secrets.
//
// The client only ever sends { commentId }. This Worker re-reads that comment straight from
// Firestore (via a Firebase service account, bypassing client-side security rules entirely) and
// only ever emails based on what's actually stored there — the POST body can't be used to inject
// arbitrary recipients or message content.
//
// AUTHENTICATION
// The caller must present a valid Firebase ID token for this project as
// `Authorization: Bearer <token>`, and must be the author of the comment being notified on.
// This replaces an earlier shared-secret header: that secret shipped inside the public web
// bundle, so anyone who viewed source could replay a commentId and re-send notification mail to
// Rotech staff at will. An ID token is per-user, expires on its own, and is verified here
// against Google's published signing keys — it cannot be lifted out of the bundle.
//
// The service account this Worker holds has full datastore scope on the whole database. Nothing
// below widens what a caller can reach with it: the only input honoured is a comment id whose
// stored authorEmail matches the verified token.

const PROJECT_ID = 'rotech-location-readiness';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const APP_URL = 'https://clandtroop.github.io/rotech-semiannual/';

const ROLE_LABELS = {
  locationManager: 'Location Manager',
  areaManager: 'Area Manager',
  regionAdmin: 'Region Admin',
  accreditationSpecialist: 'Accreditation Specialist',
};

let cachedToken = null; // { token, expiresAt } — persists across requests on a warm isolate only.

// Only the deployed app origins may call this. ALLOWED_ORIGINS is a
// comma-separated Worker environment variable; it falls back to the GitHub
// Pages origin so an unconfigured deploy fails closed rather than open.
function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || 'https://clandtroop.github.io')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
}

function corsHeaders(env, request) {
  const origin = request.headers.get('Origin');
  const allowed = allowedOrigins(env);
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

function jsonResponse(env, request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(env, request), 'Content-Type': 'application/json' },
  });
}

function base64url(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }

  const privateKeyPem = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claimSet))}`;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const jwt = `${signingInput}.${base64url(signature)}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  });
  if (!resp.ok) {
    throw new Error('Failed to obtain Google access token: ' + (await resp.text()));
  }
  const data = await resp.json();
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in };
  return data.access_token;
}

function unwrapValue(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return docFieldsToObject(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(unwrapValue);
  return null;
}

function docFieldsToObject(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields || {})) obj[k] = unwrapValue(v);
  return obj;
}

function docIdFromName(name) {
  return name.split('/').pop();
}

async function firestoreGet(token, path) {
  const resp = await fetch(`${FIRESTORE_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`Firestore GET ${path} failed: ${await resp.text()}`);
  const doc = await resp.json();
  return { id: docIdFromName(doc.name), ...docFieldsToObject(doc.fields) };
}

async function firestoreQuery(token, collectionId, filters) {
  const structuredQuery = { from: [{ collectionId }] };
  const toFieldFilter = (f) => ({
    fieldFilter: { field: { fieldPath: f.field }, op: f.op, value: { stringValue: f.value } },
  });
  if (filters.length === 1) {
    structuredQuery.where = toFieldFilter(filters[0]);
  } else if (filters.length > 1) {
    structuredQuery.where = { compositeFilter: { op: 'AND', filters: filters.map(toFieldFilter) } };
  }

  const resp = await fetch(`${FIRESTORE_BASE}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery }),
  });
  if (!resp.ok) throw new Error(`Firestore query ${collectionId} failed: ${await resp.text()}`);
  const rows = await resp.json();
  return rows
    .filter((r) => r.document)
    .map((r) => ({ id: docIdFromName(r.document.name), ...docFieldsToObject(r.document.fields) }));
}

// ---- Firebase ID token verification -------------------------------------
// Firebase signs ID tokens with rotating RSA keys published at the URL below.
// We fetch and cache them by the token's `kid`, then verify signature and
// claims ourselves — there is no Admin SDK on the Workers runtime.

const GOOGLE_PUBLIC_KEYS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedSigningKeys = null; // { keys: {kid: pem}, expiresAt }

async function getSigningKeys() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedSigningKeys && cachedSigningKeys.expiresAt > now + 60) {
    return cachedSigningKeys.keys;
  }
  const resp = await fetch(GOOGLE_PUBLIC_KEYS_URL);
  if (!resp.ok) throw new Error('Could not fetch Google signing keys');

  // Respect Google's cache-control so key rotation is picked up automatically.
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAge = parseInt((cacheControl.match(/max-age=(\d+)/) || [])[1] || '3600', 10);

  const keys = await resp.json();
  cachedSigningKeys = { keys, expiresAt: now + maxAge };
  return keys;
}

function base64urlToBytes(input) {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Minimal DER reader: returns the tag, and where this element's value and the
// element itself end.
function readTlv(bytes, offset) {
  const tag = bytes[offset];
  let i = offset + 1;
  let length = bytes[i++];
  if (length & 0x80) {
    const byteCount = length & 0x7f;
    length = 0;
    for (let k = 0; k < byteCount; k++) length = (length << 8) | bytes[i++];
  }
  return { tag, valueStart: i, end: i + length };
}

const RSA_ENCRYPTION_OID = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01];

function containsRsaOid(bytes, from, to) {
  outer: for (let i = from; i <= to - RSA_ENCRYPTION_OID.length; i++) {
    for (let j = 0; j < RSA_ENCRYPTION_OID.length; j++) {
      if (bytes[i + j] !== RSA_ENCRYPTION_OID[j]) continue outer;
    }
    return true;
  }
  return false;
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// The x509 endpoint returns certificates; Web Crypto wants the
// SubjectPublicKeyInfo. Walk the certificate's DER structure and slice out
// exactly that element — searching for the RSA OID and taking everything after
// it would also drag in the certificate's signature, which importKey rejects.
function certToSpki(pem) {
  const der = base64ToBytes(
    pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '')
  );

  const certificate = readTlv(der, 0);                         // Certificate ::= SEQUENCE
  const tbsCertificate = readTlv(der, certificate.valueStart); // TBSCertificate ::= SEQUENCE

  // SubjectPublicKeyInfo is the child SEQUENCE whose AlgorithmIdentifier
  // carries the rsaEncryption OID. Walking to it by structure keeps this
  // correct whether or not the optional [0] version field is present.
  let offset = tbsCertificate.valueStart;
  while (offset < tbsCertificate.end) {
    const child = readTlv(der, offset);
    if (child.tag === 0x30 && containsRsaOid(der, child.valueStart, child.end)) {
      return der.slice(offset, child.end).buffer;
    }
    offset = child.end;
  }
  throw new Error('Could not locate SubjectPublicKeyInfo in certificate');
}

// Verifies a Firebase ID token and returns its claims, or throws.
async function verifyIdToken(idToken) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  const header = JSON.parse(new TextDecoder().decode(base64urlToBytes(parts[0])));
  const claims = JSON.parse(new TextDecoder().decode(base64urlToBytes(parts[1])));

  if (header.alg !== 'RS256') throw new Error('Unexpected token algorithm');

  const keys = await getSigningKeys();
  const cert = keys[header.kid];
  if (!cert) throw new Error('Unknown token signing key');

  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    certToSpki(cert),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    base64urlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!valid) throw new Error('Bad token signature');

  // A valid signature is not enough: the token must be for THIS project and
  // still current, or a token minted for some other Firebase project would be
  // accepted here.
  const now = Math.floor(Date.now() / 1000);
  if (claims.aud !== PROJECT_ID) throw new Error('Token audience mismatch');
  if (claims.iss !== `https://securetoken.google.com/${PROJECT_ID}`) {
    throw new Error('Token issuer mismatch');
  }
  if (!claims.sub) throw new Error('Token has no subject');
  if (typeof claims.exp !== 'number' || claims.exp <= now) throw new Error('Token expired');
  if (typeof claims.iat === 'number' && claims.iat > now + 300) throw new Error('Token issued in the future');
  if (!claims.email) throw new Error('Token has no email');

  return claims;
}

// Stamps notifiedAt on the comment so a replayed request cannot re-send mail.
// updateMask keeps this to the one field — the comment body is never rewritten.
async function markNotified(token, commentId) {
  const url = `${FIRESTORE_BASE}/submission_comments/${commentId}` +
    '?updateMask.fieldPaths=notifiedAt';
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { notifiedAt: { timestampValue: new Date().toISOString() } } }),
  });
  if (!resp.ok) console.error('Could not mark comment notified:', await resp.text());
}

async function sendViaMailjet(env, recipients, subject, textBody) {
  const messages = recipients.map((email) => ({
    From: { Email: env.MAILJET_SENDER_EMAIL, Name: env.MAILJET_SENDER_NAME || 'Rotech Location Readiness' },
    To: [{ Email: email }],
    Subject: subject,
    TextPart: textBody,
  }));

  const resp = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${env.MAILJET_API_KEY}:${env.MAILJET_API_SECRET}`),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Messages: messages }),
  });
  if (!resp.ok) {
    console.error('Mailjet send failed', await resp.text());
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env, request) });
    }
    if (request.method !== 'POST') {
      return jsonResponse(env, request, { ok: false, error: 'Method not allowed' }, 405);
    }

    // Caller must present a valid Firebase ID token for this project.
    const authHeader = request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken) {
      return jsonResponse(env, request, { ok: false, error: 'Unauthorized' }, 401);
    }

    let claims;
    try {
      claims = await verifyIdToken(idToken);
    } catch (err) {
      console.error('ID token rejected:', String(err));
      return jsonResponse(env, request, { ok: false, error: 'Unauthorized' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(env, request, { ok: false, error: 'Invalid JSON' }, 400);
    }
    const commentId = body && body.commentId;
    if (!commentId || typeof commentId !== 'string') {
      return jsonResponse(env, request, { ok: false, error: 'Missing commentId' }, 400);
    }

    try {
      const token = await getAccessToken(env);

      const comment = await firestoreGet(token, `submission_comments/${commentId}`);
      if (!comment) {
        return jsonResponse(env, request, { ok: false, error: 'Comment not found' }, 404);
      }

      // You may only trigger notification for a comment you actually wrote.
      // Without this, any signed-in user could still walk arbitrary comment ids
      // and re-send mail for all of them.
      const callerEmail = String(claims.email).toLowerCase();
      if (String(comment.authorEmail || '').toLowerCase() !== callerEmail) {
        return jsonResponse(env, request, { ok: false, error: 'Forbidden' }, 403);
      }

      // Notify once per comment. A repeat call is a no-op rather than another
      // round of email to every participant in the thread.
      if (comment.notifiedAt) {
        return jsonResponse(env, request, { ok: true, notified: 0, reason: 'already notified' });
      }

      const [threadComments, lmUsers, location] = await Promise.all([
        firestoreQuery(token, 'submission_comments', [
          { field: 'assessmentId', op: 'EQUAL', value: comment.assessmentId },
        ]),
        firestoreQuery(token, 'users', [
          { field: 'role', op: 'EQUAL', value: 'locationManager' },
          { field: 'locationId', op: 'EQUAL', value: comment.locationId },
        ]),
        firestoreGet(token, `locations/${comment.locationId}`).catch(() => null),
      ]);

      const recipients = new Set();
      for (const u of lmUsers) if (u.email) recipients.add(u.email);
      for (const c of threadComments) if (c.authorEmail) recipients.add(c.authorEmail);
      recipients.delete(comment.authorEmail);

      if (recipients.size === 0) {
        return jsonResponse(env, request, { ok: true, notified: 0 });
      }

      const locationLabel = location ? `${location.name} (#${location.lawsonNumber})` : comment.locationId;
      const subject = `New comment on ${comment.assessmentType} — ${locationLabel} (${comment.quarter})`;
      const roleLabel = ROLE_LABELS[comment.authorRole] || comment.authorRole;
      const textBody =
        `${comment.authorEmail} (${roleLabel}) commented on the ${comment.assessmentType} ` +
        `submission for ${locationLabel}:\n\n"${comment.text}"\n\n` +
        `Log in to view and reply: ${APP_URL}`;

      await sendViaMailjet(env, Array.from(recipients), subject, textBody);

      // Mark it notified so a replay cannot re-send the same thread's mail.
      await markNotified(token, commentId);

      return jsonResponse(env, request, { ok: true, notified: recipients.size });
    } catch (err) {
      console.error('notify-comment error', err);
      // Don't echo internal error text back to the caller.
      return jsonResponse(env, request, { ok: false, error: 'Internal error' }, 500);
    }
  },
};
