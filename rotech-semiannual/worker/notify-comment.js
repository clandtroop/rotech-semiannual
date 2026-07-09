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

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Notify-Secret',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
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
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
    }

    const secret = request.headers.get('X-Notify-Secret');
    if (!secret || secret !== env.NOTIFY_SHARED_SECRET) {
      return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400);
    }
    const commentId = body && body.commentId;
    if (!commentId || typeof commentId !== 'string') {
      return jsonResponse({ ok: false, error: 'Missing commentId' }, 400);
    }

    try {
      const token = await getAccessToken(env);

      const comment = await firestoreGet(token, `submission_comments/${commentId}`);
      if (!comment) {
        return jsonResponse({ ok: false, error: 'Comment not found' }, 404);
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
        return jsonResponse({ ok: true, notified: 0 });
      }

      const locationLabel = location ? `${location.name} (#${location.lawsonNumber})` : comment.locationId;
      const subject = `New comment on ${comment.assessmentType} — ${locationLabel} (${comment.quarter})`;
      const roleLabel = ROLE_LABELS[comment.authorRole] || comment.authorRole;
      const textBody =
        `${comment.authorEmail} (${roleLabel}) commented on the ${comment.assessmentType} ` +
        `submission for ${locationLabel}:\n\n"${comment.text}"\n\n` +
        `Log in to view and reply: ${APP_URL}`;

      await sendViaMailjet(env, Array.from(recipients), subject, textBody);

      return jsonResponse({ ok: true, notified: recipients.size });
    } catch (err) {
      console.error('notify-comment error', err);
      return jsonResponse({ ok: false, error: String(err) }, 500);
    }
  },
};
