// Comment-notification relay (Cloudflare Worker — see worker/notify-comment.js and
// CLOUDFLARE_WORKER_SETUP.md). notifyNewComment() no-ops if NOTIFY_WORKER_URL is ever cleared,
// so comment posting is unaffected even if the Worker is down or removed.
//
// NOTIFY_SHARED_SECRET is not a real secret — like firebaseConfig in ./firebase.js, it ships in
// the public bundle. It only deters casual/automated hits; the actual protection is that the
// Worker re-reads the comment from Firestore itself rather than trusting the request body.
export const NOTIFY_WORKER_URL = 'https://winter-unit-4b72.clandtroop.workers.dev/';
export const NOTIFY_SHARED_SECRET = 'MNn_qsX4_vuqO-ugbIRlyAFGVJji8MuI';

export function notifyNewComment(commentId) {
  if (!NOTIFY_WORKER_URL) return;
  fetch(NOTIFY_WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Notify-Secret': NOTIFY_SHARED_SECRET },
    body: JSON.stringify({ commentId }),
  }).catch(() => {});
}
