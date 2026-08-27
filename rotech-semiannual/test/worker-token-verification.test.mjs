// Exercises the Worker's verifyIdToken against tokens we mint ourselves:
// a good one signed by a key the (stubbed) key endpoint serves, and a series of
// attacks that must each be rejected.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const PROJECT_ID = 'rotech-location-readiness';

// Generate a signing key + self-signed cert to stand in for Google's.
const tmp = mkdtempSync(join(tmpdir(), 'rotech-worker-test-'));
execSync(`openssl req -x509 -newkey rsa:2048 -keyout ${tmp}/k.pem -out ${tmp}/c.pem ` +
  '-days 1 -nodes -subj "/CN=securetoken" 2>/dev/null', { shell: '/bin/bash' });
const privateKey = readFileSync(join(tmp, 'k.pem'), 'utf8');
const certPem = readFileSync(join(tmp, 'c.pem'), 'utf8');
const KID = 'testkid';

// Stub the two globals the Worker code reaches for.
globalThis.fetch = async (url) => {
  if (String(url).includes('robot/v1/metadata/x509')) {
    return {
      ok: true,
      headers: { get: () => 'public, max-age=3600' },
      json: async () => ({ [KID]: certPem }),
    };
  }
  throw new Error('unexpected fetch: ' + url);
};
globalThis.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');
// Node 22 already exposes webcrypto as globalThis.crypto.
globalThis.console = console;

// Pull the verification block straight out of the Worker source.
const src = readFileSync(new URL('../worker/notify-comment.js', import.meta.url), 'utf8');
const block = src.slice(
  src.indexOf('// ---- Firebase ID token verification'),
  src.indexOf('// Stamps notifiedAt on the comment')
);
writeFileSync(join(tmp, 'verifyBlock.mjs'),
  `const PROJECT_ID = ${JSON.stringify(PROJECT_ID)};\n` + block +
  '\nexport { verifyIdToken, certToSpki };\n');
const { verifyIdToken } = await import(`file://${join(tmp, 'verifyBlock.mjs')}`);

const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function mint(claims, { kid = KID, alg = 'RS256', key = privateKey } = {}) {
  const header = b64url(JSON.stringify({ alg, typ: 'JWT', kid }));
  const payload = b64url(JSON.stringify(claims));
  const signingInput = `${header}.${payload}`;
  if (alg === 'none') return `${signingInput}.`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(signingInput), key);
  return `${signingInput}.${b64url(sig)}`;
}

const now = Math.floor(Date.now() / 1000);
const goodClaims = {
  aud: PROJECT_ID,
  iss: `https://securetoken.google.com/${PROJECT_ID}`,
  sub: 'uid-123',
  email: 'lm100@rotech.com',
  iat: now - 60,
  exp: now + 3600,
};

let passed = 0, failed = 0;
async function expectOk(name, token) {
  try {
    const c = await verifyIdToken(token);
    if (c.email !== goodClaims.email) throw new Error('wrong email returned');
    console.log(`  PASS  ${name}`); passed++;
  } catch (e) {
    console.log(`  FAIL  ${name} — ${e.message}`); failed++;
  }
}
async function expectReject(name, token) {
  try {
    await verifyIdToken(token);
    console.log(`  FAIL  ${name} — token was ACCEPTED`); failed++;
  } catch {
    console.log(`  PASS  ${name}`); passed++;
  }
}

console.log('\n== Firebase ID token verification ==');
await expectOk('valid token for this project is accepted', mint(goodClaims));

await expectReject('expired token', mint({ ...goodClaims, exp: now - 10 }));
await expectReject('token for a DIFFERENT Firebase project', mint({ ...goodClaims, aud: 'some-other-project' }));
await expectReject('wrong issuer', mint({ ...goodClaims, iss: 'https://evil.example.com/' }));
await expectReject('alg:none unsigned token', mint(goodClaims, { alg: 'none' }));
await expectReject('unknown signing key id', mint(goodClaims, { kid: 'not-a-real-kid' }));
await expectReject('token with no email claim', mint({ ...goodClaims, email: undefined }));
await expectReject('token with no subject', mint({ ...goodClaims, sub: undefined }));
await expectReject('malformed token', 'not.a.jwt.at.all');
await expectReject('empty token', '');

// Signature forgery: sign with an attacker key while claiming Google's kid.
const attackerKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs8', format: 'pem' });
await expectReject('signed by an attacker key under a valid kid',
  mint(goodClaims, { key: attackerKey }));

// Tampered payload, original signature.
const valid = mint(goodClaims);
const [h, , sig] = valid.split('.');
const tampered = `${h}.${b64url(JSON.stringify({ ...goodClaims, email: 'spec@rotech.com' }))}.${sig}`;
await expectReject('payload swapped after signing', tampered);

console.log(`\n${passed} passed, ${failed} failed\n`);
rmSync(tmp, { recursive: true, force: true });
process.exit(failed > 0 ? 1 : 0);
