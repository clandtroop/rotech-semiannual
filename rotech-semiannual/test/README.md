# Firestore security-rules tests

`firestore-rules.test.mjs` runs `../firestore.rules` against the Firestore
emulator and asserts the read-isolation boundary the platform depends on: that a
user in one location, area or region cannot read another's assessments,
comments or corrective action logs, and that the paths people legitimately need
still work.

It never touches production — the emulator is a local, in-memory Firestore
seeded with its own fixture data.

## Running

Requires Java 11+ (the emulator runs on the JVM).

```bash
npm install --no-save firebase-tools @firebase/rules-unit-testing firebase
npx firebase emulators:exec --only firestore --project rotech-rules-test \
  "node test/firestore-rules.test.mjs"
```

Exit code is non-zero if any assertion fails, so it drops straight into CI.

## What it covers

| Group | Asserts |
| --- | --- |
| Unauthenticated access | Anonymous users read nothing; invites cannot be enumerated |
| Identity with no profile | A signed-in account with no `users/{uid}` doc reads nothing — closes the self-registration path |
| Location Manager | Own location only; cannot widen a query to their area or region |
| Area Manager | Own area only; cannot read a sibling area in the same region |
| Region Admin | Own region only; cannot read another region |
| Accreditation Specialist | Company-wide reads, as intended |
| Writes | Cannot submit for another location, forge scope fields, edit a submitted assessment, or post a comment as someone else / in a higher role |
| Privilege escalation | Cannot self-promote, self-transfer region, read another user's profile, or write the location roster |
| Invites | Expired invites are dead; an invite cannot be redeemed for a higher role or by a different email |

## Why the scope fields exist

Firestore evaluates a rule against a **query**, not against the documents it
would return, so a rule can only restrict reads on a field the query itself
filters on. That is why `assessments`, `submission_comments` and
`corrective_action_logs` each carry `locationId`, `areaId` and `regionId`
denormalized onto the document, and why every client query filters on the
caller's own scope field (see `src/lib/scope.js`).

The two halves must stay in step. Drop the client-side filter and Firestore
rejects the query outright; loosen a rule here and the isolation is gone. These
tests are what catch either mistake.
