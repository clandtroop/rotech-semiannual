# TODO

Pending work items not yet implemented.

## UX / Polish

- **Friendly login error messages** — `src/components/Login.jsx` currently displays Firebase
  Auth's raw SDK error message verbatim (e.g. `"Firebase: Error (auth/invalid-credential)."`).
  Map `err.code` to friendlier custom text in the `catch` block of `handleSubmit` instead.
- **Password reset link** — Login page has no "Forgot password" flow. Firebase Auth supports
  `sendPasswordResetEmail` out of the box; just needs a link + handler wired up in `Login.jsx`.
- **Mobile check** — verify the wide tables (OP541's ~150-item Facility/Warehouse/Vehicle
  review, Location Detail tables) are usable on phone/tablet for field-based Location Managers.

## Data Quality

- **Clean up known Firestore data issues** — a stray blank `regions` doc and a stray blank
  `locations` doc (visible as extra "0/0/0/0%" rows on the Accreditation dashboard), plus the
  test comment left on Beaverton's OP512 submission (`submission_comments`) during verification
  of the comment/feedback feature.

## Notifications

- **Email notifications for comments** — posting a comment in the new comment/feedback system is
  currently silent; nobody is notified unless they happen to open the dashboard. Needs a
  transactional email provider (Firebase's "Trigger Email" extension or similar) — same
  infrastructure decision as the invite-by-email system being built for signup.
