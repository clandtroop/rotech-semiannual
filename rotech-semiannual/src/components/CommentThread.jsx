import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { notifyNewComment } from '../lib/notifyConfig';

const ROLE_LABELS = {
  locationManager: { label: 'Location Manager', badge: 'bg-gray-200 text-gray-800' },
  areaManager: { label: 'Area Manager', badge: 'bg-blue-200 text-blue-800' },
  regionAdmin: { label: 'Region Admin', badge: 'bg-indigo-200 text-indigo-800' },
  accreditationSpecialist: { label: 'Accreditation Specialist', badge: 'bg-green-200 text-green-800' },
};

function formatTimestamp(ts) {
  if (!ts?.toDate) return '';
  return ts.toDate().toLocaleString();
}

export default function CommentThread({ assessmentId, locationId, assessmentType, quarter, locationName, currentUserEmail, currentUserRole, onClose, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadComments = async () => {
      try {
        const q = query(collection(db, 'submission_comments'), where('assessmentId', '==', assessmentId));
        const snapshot = await getDocs(q);
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        items.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        setComments(items);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [assessmentId]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setPosting(true);
    setError('');

    try {
      const payload = {
        assessmentId,
        locationId,
        assessmentType,
        quarter,
        authorEmail: currentUserEmail,
        authorRole: currentUserRole,
        text: newText.trim(),
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'submission_comments'), payload);
      notifyNewComment(docRef.id);
      setComments(prev => [...prev, { ...payload, createdAt: { toDate: () => new Date() } }]);
      setNewText('');
      if (onCountChange) onCountChange(assessmentId, comments.length + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{assessmentType} Comments</h3>
            <p className="text-sm text-gray-600">{locationName} &middot; {quarter}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500 text-center">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">No comments yet. Start the conversation below.</p>
          ) : (
            comments.map((comment, i) => {
              const role = ROLE_LABELS[comment.authorRole] || { label: comment.authorRole, badge: 'bg-gray-200 text-gray-800' };
              return (
                <div key={comment.id || i} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${role.badge}`}>{role.label}</span>
                      <span className="text-sm text-gray-700">{comment.authorEmail}</span>
                    </div>
                    <span className="text-xs text-gray-400">{formatTimestamp(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{comment.text}</p>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handlePost} className="p-4 border-t border-gray-200 space-y-2">
          {error && <div className="text-sm text-red-700 bg-red-100 rounded-lg p-2">{error}</div>}
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add a comment..."
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={posting || !newText.trim()}
            className="w-full bg-blue-900 text-white py-2 rounded-lg font-medium hover:bg-blue-800 transition disabled:opacity-50"
          >
            {posting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      </div>
    </div>
  );
}
