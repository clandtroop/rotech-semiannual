# Setting up comment email notifications

This wires up real email notifications when someone posts a comment on a submission. It uses a
free Cloudflare Worker (no Firebase billing plan required) that relays to Mailjet. I can't do any
of this setup myself — no Cloudflare, Mailjet, or Firebase service-account credentials — so these
are steps for you to run through. Once you've deployed the Worker and sent me its URL, I'll wire
it into the app and do a final live test.

## 1. Create the Cloudflare Worker

1. Sign up for a free account at [dash.cloudflare.com](https://dash.cloudflare.com) if you don't
   already have one.
2. Workers & Pages → Create → Create Worker. Give it a name (e.g. `rotech-notify-comment`).
3. Once created, open it → "Edit code" (Quick Edit). Delete the placeholder code and paste in the
   full contents of `worker/notify-comment.js` from this repo.
4. Click "Save and deploy". Note the URL it gives you — something like
   `https://rotech-notify-comment.<your-subdomain>.workers.dev`. **Send me this URL** once you have
   it; I'll plug it into the app.

## 2. Create a Mailjet account

1. Sign up for free at [mailjet.com](https://www.mailjet.com) (free tier covers low-volume
   transactional email like this).
2. Add and verify a sender email address or domain (Account Settings → Sender addresses & domains)
   — Mailjet won't send until a sender is verified. Using an address like
   `notifications@rotech.com` (if you control that domain's DNS) is ideal; a personal verified
   address works too for now.
3. Account Settings → REST API → API Key Management. Copy the **API Key** and **Secret Key**.

## 3. Generate a Firebase service account key

1. [Firebase Console](https://console.firebase.google.com) → your project → the gear icon →
   Project Settings → Service Accounts tab.
2. Click "Generate new private key" — downloads a JSON file. **Keep this file safe** — it grants
   admin access to your Firestore data, same as any other cloud credential.
3. Open the JSON file; you'll need two fields from it in the next step: `client_email` and
   `private_key`.

## 4. Add secrets to the Worker

Back in the Cloudflare dashboard, open your Worker → Settings → Variables and Secrets. Add each of
these as an **encrypted secret** (not a plaintext variable):

| Name | Value |
|---|---|
| `FIREBASE_CLIENT_EMAIL` | the `client_email` field from the service account JSON |
| `FIREBASE_PRIVATE_KEY` | the `private_key` field from the service account JSON, pasted exactly as-is (it contains literal `\n` sequences — leave them as-is, the Worker code un-escapes them) |
| `MAILJET_API_KEY` | from step 2 |
| `MAILJET_API_SECRET` | from step 2 |
| `MAILJET_SENDER_EMAIL` | the verified sender address from step 2 |
| `MAILJET_SENDER_NAME` | e.g. `Rotech Location Readiness` |
| `NOTIFY_SHARED_SECRET` | `MNn_qsX4_vuqO-ugbIRlyAFGVJji8MuI` — a value I generated; this exact string is already wired into the app's client code, so paste it in verbatim |

Save, which redeploys the Worker with the new secrets available.

## 5. Send me the Worker URL

Once steps 1–4 are done, send me the `https://....workers.dev` URL from step 1. I'll drop it into
`src/lib/notifyConfig.js`, build, and deploy the app.

## 6. Verify it's working

After I've wired in the URL and deployed:

1. Post a comment on any submission in the live app (as any role).
2. In the Cloudflare dashboard, open the Worker → Logs (or "Begin log stream") and confirm you see
   a request come in with a `200` response.
3. In Mailjet, go to Statistics → Message History (or similar, naming varies by plan) and confirm
   a "sent" event appears for that request.
4. Check the recipient's actual inbox (including spam folder, since it's a brand-new sending
   domain/address) to confirm delivery. I can't check third-party inboxes myself, so this
   confirmation has to come from you.

If step 2 shows an error instead of `200`, send me the log output — the most likely causes are a
mistyped secret (extra whitespace, wrong field copied) or the private key's `\n` sequences getting
mangled when pasted.

## 7. Domain authentication (needed for reliable inbox delivery)

A verified single sender address alone (step 2) is enough for Mailjet to *accept* and send mail,
but without SPF/DKIM/DMARC on the sending domain, receiving mail servers — Microsoft 365/Defender
in particular — will often quarantine or spam-filter it, since there's no proof Mailjet is
authorized to send as that domain. Sending domain: **rotechsurveyready.org** (registered via
Cloudflare, so its DNS is already on Cloudflare's nameservers).

1. In Mailjet: Account Settings → Sender addresses & domains → **Add a domain** (not just a single
   sender) → enter `rotechsurveyready.org`. Mailjet will show a set of DNS records to add (an SPF
   TXT record, one or more DKIM TXT/CNAME records, and usually a domain-ownership verification TXT
   record). Copy each **exactly** as Mailjet displays them — don't retype/reformat.
2. In the Cloudflare dashboard → the `rotechsurveyready.org` zone → DNS → Add each record from
   step 1 with the same Type/Name/Content Mailjet showed. **Important**: for any CNAME record
   (the DKIM one), set the proxy status to **DNS only** (grey cloud, not orange) — Cloudflare's
   proxy is for web traffic and will break a DKIM lookup if left on.
3. Add one more record Mailjet won't prompt for — DMARC, which Microsoft 365 weighs heavily for
   inbox-vs-spam decisions: Type `TXT`, Name `_dmarc`, Content
   `v=DMARC1; p=quarantine; rua=mailto:<your real email>`. Since this domain has no existing mail
   traffic to protect, it's safe to start at `p=quarantine` rather than the usual cautious
   `p=none` rollout.
4. Back in Mailjet, click to verify/check the domain — Cloudflare's DNS updates are usually fast,
   but allow a few minutes. Mailjet will show a green check per record once detected.
5. Update the Worker's `MAILJET_SENDER_EMAIL` secret (Settings → Variables and Secrets) to an
   address on the new domain, e.g. `notifications@rotechsurveyready.org` — no actual mailbox
   needed there, it's send-only.
6. Re-verify end to end the same way as step 6 above.
