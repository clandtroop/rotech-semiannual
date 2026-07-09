# Publishing `firestore.rules` safely

## Before you publish

1. In the Firebase Console → Firestore Database → Rules tab, copy the **current** rules text
   somewhere safe (a scratch file, a note) before pasting the new version in. That's your
   instant rollback if anything below doesn't behave — paste the old text back and hit Publish
   again.
2. Paste in the contents of `firestore.rules` from this repo, but **don't publish yet** — use
   the "Rules Playground" (top right of the Rules tab) to run the scenarios below against the
   *simulated* new rules first.

## Rules Playground scenarios to run

For each row: set the operation/path/auth as described, hit "Run", and confirm the result
matches. "Authenticated as" means checking "Simulate authentication" and either entering a
data-owner UID or leaving it blank for the unauthenticated cases.

| # | Operation | Path | Auth | Expected |
|---|---|---|---|---|
| 1 | get | `locations/{any real location id}` | Unauthenticated | **Deny** |
| 2 | get | `locations/{any real location id}` | Any real user UID | **Allow** |
| 3 | get | `invites/{a real, current invite token if one exists, or any string}` | Unauthenticated | **Allow** (this is the one deliberately-open path — the invite acceptance page depends on it) |
| 4 | list | `invites` | Unauthenticated | **Deny** |
| 5 | list | `invites` | A Location Manager's UID | **Deny** |
| 6 | list | `invites` | An Accreditation Specialist's UID | **Allow** |
| 7 | create | `assessments/test1` with `{ locationId: "<some other location's id>" }` | A Location Manager's UID (whose own `users` doc has a *different* `locationId`) | **Deny** |
| 8 | create | `assessments/test1` with `{ locationId: "<their own locationId>" }` | That same Location Manager's UID | **Allow** |
| 9 | create | `invites/test2` with `{ role: "accreditationSpecialist", regionId: null, ... }` | A Region Admin's UID | **Deny** (Region Admins may only invite `locationManager` / `areaManager`) |
| 10 | create | `invites/test2` with `{ role: "locationManager", regionId: "<a different region's id>", ... }` | A Region Admin's UID | **Deny** (wrong region) |
| 11 | create | `invites/test2` with `{ role: "locationManager", regionId: "<their own region's id>", invitedByUid: "<their own uid>", ... }` | That same Region Admin's UID | **Allow** |
| 12 | write (any) | `regions/{any id}` | A Location Manager's UID | **Deny** |
| 13 | write (any) | `regions/{any id}` | An Accreditation Specialist's UID | **Allow** |
| 14 | create | `users/{some uid}` with a fabricated `role: "accreditationSpecialist"` and **no** valid `inviteToken` | That uid, freshly authenticated | **Deny** |
| 15 | update | `invites/{a real pending invite}` setting `status: "accepted"` | Authenticated with an email that does **not** match `resource.data.email` | **Deny** |

If every row matches its expected result, publish. If any row doesn't match, stop, don't
publish, and send me the row number + what you saw — I'll adjust the rule before you try again.

## After publishing — quick smoke test in the live app

Do these as fast confirmation the app itself still works end-to-end (not just the simulator):

- [ ] Log in as each of the 4 roles you have test/real accounts for; confirm each dashboard
      still loads its data (regions/locations/assessments/comments all still visible).
- [ ] As a Location Manager, submit one of the assessment forms (JC427/OP541/OP512) for their
      own location; confirm it saves.
- [ ] As an Accreditation Specialist, send a test invite to a throwaway email, open the link in
      an incognito window, and complete account creation; confirm it lands on the right
      dashboard and the invite flips to "accepted" in the Pending Invites list.
- [ ] Add one comment on a submission via the comment thread UI; confirm it appears.

If any of these fail after publishing, revert to the rules text you saved in step 1 above while
we debug — that gets you back to a known-working state immediately.
