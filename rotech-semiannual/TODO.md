# TODO

Pending work items not yet implemented.

## UX / Polish

- **Friendly login error messages** — `src/components/Login.jsx` currently displays Firebase
  Auth's raw SDK error message verbatim (e.g. `"Firebase: Error (auth/invalid-credential)."`).
  Map `err.code` to friendlier custom text in the `catch` block of `handleSubmit` instead.
- **Password reset link** — Login page has no "Forgot password" flow. Firebase Auth supports
  `sendPasswordResetEmail` out of the box; just needs a link + handler wired up in `Login.jsx`.
- ~~**Mobile check**~~ — done. All 4 dashboard headers (title + action buttons) overflowed the
  viewport on phone widths, forcing the whole page to scroll horizontally; fixed by making the
  header row stack vertically below the `sm` breakpoint. OP541's review table, data tables
  (already `overflow-x-auto`-wrapped), and all modals were already responsive — no changes needed.

## Data Quality

- ~~**Clean up known Firestore data issues**~~ — mostly done. Deleted the stray blank `regions`
  doc (`r86DxgBgEQSApL6CMWsk`) and stray blank `locations` doc (`bbIaTA9ppp21bySX3qFZ`) directly.
  Found *two* test comments on Beaverton's OP512 submission (`submission_comments` docs
  `q1tUtsp3PQ8cI1FHNBGl` and `5HyRfni78v7dZFYqWZru`), not just one — `submission_comments` is
  append-only in `firestore.rules` (no delete rule, by design, matching how the app itself works),
  so these need to be deleted manually via the Firebase Console's data viewer rather than through
  the app.

## Notifications

- ~~**Email notifications for comments**~~ — done and live-verified. `worker/notify-comment.js`
  (Cloudflare Worker, no npm deps) resolves recipients via a Firebase service account and sends
  through Mailjet; `CommentThread.jsx` calls it after every successful comment post via
  `src/lib/notifyConfig.js`. Sending domain `rotechsurveyready.org` is authenticated with
  SPF/DKIM/DMARC. Confirmed delivered to a Gmail inbox end-to-end. Delivery to `@rotech.com`
  addresses is still unconfirmed — likely held in Microsoft 365 Defender quarantine on the
  receiving side (a corporate mail-admin question, not a sending-pipeline issue); worth checking
  the quarantine portal for a message from `notifications@rotechsurveyready.org` if that matters.
