# TODO

Pending work items not yet implemented.

## UX / Polish

- ~~**Friendly login error messages**~~ — done. `Login.jsx` maps common `err.code` values
  (invalid credential, user not found, disabled, too many requests, etc.) to plain-language text
  instead of showing the raw Firebase SDK error.
- ~~**Password reset link**~~ — done. "Forgot password?" next to the password field calls
  `sendPasswordResetEmail`, with friendly errors and a success confirmation.
- ~~**Mobile check**~~ — done. All 4 dashboard headers (title + action buttons) overflowed the
  viewport on phone widths, forcing the whole page to scroll horizontally; fixed by making the
  header row stack vertically below the `sm` breakpoint. OP541's review table, data tables
  (already `overflow-x-auto`-wrapped), and all modals were already responsive — no changes needed.

## Data Quality

- ~~**Clean up known Firestore data issues**~~ — done. Deleted the stray blank `regions` doc
  (`r86DxgBgEQSApL6CMWsk`), stray blank `locations` doc (`bbIaTA9ppp21bySX3qFZ`), and the two test
  comments on Beaverton's OP512 submission (`q1tUtsp3PQ8cI1FHNBGl`, `5HyRfni78v7dZFYqWZru`).
  `firestore.rules` now grants Accreditation Specialist a `delete` rule on `submission_comments`
  (previously append-only with no delete path at all) as a general moderation capability, not just
  a one-off — matches their existing full-access role.

## Notifications

- ~~**Email notifications for comments**~~ — done and live-verified. `worker/notify-comment.js`
  (Cloudflare Worker, no npm deps) resolves recipients via a Firebase service account and sends
  through Mailjet; `CommentThread.jsx` calls it after every successful comment post via
  `src/lib/notifyConfig.js`. Sending domain `rotechsurveyready.org` is authenticated with
  SPF/DKIM/DMARC. Confirmed delivered to a Gmail inbox end-to-end. Delivery to `@rotech.com`
  addresses is still unconfirmed — likely held in Microsoft 365 Defender quarantine on the
  receiving side (a corporate mail-admin question, not a sending-pipeline issue); worth checking
  the quarantine portal for a message from `notifications@rotechsurveyready.org` if that matters.
