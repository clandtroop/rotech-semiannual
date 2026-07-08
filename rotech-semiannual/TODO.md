# TODO

Pending work items not yet implemented.

## UX / Polish

- **Friendly login error messages** — `src/components/Login.jsx` currently displays Firebase
  Auth's raw SDK error message verbatim (e.g. `"Firebase: Error (auth/invalid-credential)."`).
  Map `err.code` to friendlier custom text in the `catch` block of `handleSubmit` instead.
