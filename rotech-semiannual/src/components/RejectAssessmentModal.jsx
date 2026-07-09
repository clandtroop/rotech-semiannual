import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { notifyNewComment } from '../lib/notifyConfig';

export default function RejectAssessmentModal({ assessment, locationId, assessmentType, quarter, locationName, currentUserEmail, currentUserRole, onClose, onRejected }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleReject = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      await updateDoc(doc(db, 'assessments', assessment.id), {
        status: 'rejected',
        rejectionReason: reason.trim(),
        rejectedBy: currentUserEmail,
        rejectedAt: serverTimestamp(),
      });

      // Record the reason in the existing comment thread so the location manager sees it
      // in context and gets the same email notification comments already trigger.
      const commentRef = await addDoc(collection(db, 'submission_comments'), {
        assessmentId: assessment.id,
        locationId,
        assessmentType,
        quarter,
        authorEmail: currentUserEmail,
        authorRole: currentUserRole,
        text: `🚫 Assessment rejected: ${reason.trim()}`,
        createdAt: serverTimestamp(),
      });
      notifyNewComment(commentRef.id);

      onRejected();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Reject {assessmentType} Assessment</h3>
            <p className="text-sm text-gray-600">{locationName} &middot; {quarter}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleReject} className="p-4 space-y-3">
          <p className="text-sm text-gray-700">
            The location manager will be notified and able to fix and resubmit this assessment for {quarter}.
          </p>
          {error && <div className="text-sm text-red-700 bg-red-100 rounded-lg p-2">{error}</div>}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain what needs to be corrected before this can be accepted..."
            rows="4"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
            >
              {submitting ? 'Rejecting...' : 'Reject Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
