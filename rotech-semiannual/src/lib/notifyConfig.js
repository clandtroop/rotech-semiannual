// Comment-notification relay (Cloudflare Worker — see worker/notify-comment.js
// and CLOUDFLARE_WORKER_SETUP.md). notifyNewComment() no-ops if
// NOTIFY_WORKER_URL is ever cleared, so comment posting is unaffected even if
// the Worker is down or removed.
//
// This used to authenticate with a shared secret held in this file. That was
// never a real control: everything in this module ships in the public bundle,
// so the "secret" was readable by anyone who viewed source, and with it anyone
// could replay a commentId to re-send notification emails to Rotech staff as
// often as they liked. The Worker now verifies the caller's Firebase ID token
// instead — a real credential, minted per user, that expires on its own and
// cannot be lifted out of the bundle.

import { auth } from './firebase';

export const NOTIFY_WORKER_URL = 'https://winter-unit-4b72.clandtroop.workers.dev/';

export async function notifyNewComment(commentId) {
  if (!NOTIFY_WORKER_URL) return;

  const user = auth.currentUser;
  if (!user) return;

  try {
    const idToken = await user.getIdToken();
    await fetch(NOTIFY_WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ commentId }),
    });
  } catch {
    // Notification is best-effort: the comment is already saved, and the
    // thread is the system of record. Never surface this to the user.
  }
}
