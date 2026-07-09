import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFlaggedSections, CORRECTIVE_ACTION_THRESHOLD } from '../utils/correctiveActions';

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

export default function CorrectiveActionModal({ assessment, locationId, assessmentType, quarter, locationName, currentUserEmail, currentUserRole, onClose }) {
  const flaggedSections = getFlaggedSections(assessment);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [sectionKey, setSectionKey] = useState(flaggedSections[0]?.key || '');
  const [text, setText] = useState('');

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const q = query(collection(db, 'corrective_action_logs'), where('assessmentId', '==', assessment.id));
        const snapshot = await getDocs(q);
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        items.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        setLogs(items);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [assessment.id]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!text.trim() || !sectionKey) return;
    setPosting(true);
    setError('');

    try {
      const section = flaggedSections.find(s => s.key === sectionKey);
      const payload = {
        assessmentId: assessment.id,
        locationId,
        assessmentType,
        quarter,
        sectionKey,
        sectionLabel: section?.label || sectionKey,
        authorEmail: currentUserEmail,
        authorRole: currentUserRole,
        text: text.trim(),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'corrective_action_logs'), payload);
      setLogs(prev => [...prev, { ...payload, createdAt: { toDate: () => new Date() } }]);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const isDocumented = (key) => logs.some(l => l.sectionKey === key);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{assessmentType} Corrective Actions</h3>
            <p className="text-sm text-gray-600">{locationName} &middot; {quarter}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-2">
              Sections needing corrective action ({CORRECTIVE_ACTION_THRESHOLD}+ negative responses)
            </h4>
            {flaggedSections.length === 0 ? (
              <p className="text-sm text-gray-500">No sections crossed the corrective action threshold.</p>
            ) : (
              <ul className="space-y-2">
                {flaggedSections.map(section => (
                  <li
                    key={section.key}
                    className="flex justify-between items-center border border-gray-200 rounded-lg p-2 text-sm"
                  >
                    <span className="text-gray-800">{section.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-red-700 font-semibold">{section.negativeCount} negative</span>
                      {isDocumented(section.key) ? (
                        <span className="text-green-700 font-semibold">✓ Documented</span>
                      ) : (
                        <span className="text-yellow-700 font-semibold">⚠ Needs documentation</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-2">Corrective action log</h4>
            {loading ? (
              <p className="text-sm text-gray-500 text-center">Loading log...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center">No corrective actions logged yet.</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log, i) => {
                  const role = ROLE_LABELS[log.authorRole] || { label: log.authorRole, badge: 'bg-gray-200 text-gray-800' };
                  return (
                    <div key={log.id || i} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${role.badge}`}>{role.label}</span>
                          <span className="text-sm text-gray-700">{log.authorEmail}</span>
                        </div>
                        <span className="text-xs text-gray-400">{formatTimestamp(log.createdAt)}</span>
                      </div>
                      <p className="text-xs font-semibold text-blue-900 mb-1">{log.sectionLabel}</p>
                      <p className="text-sm text-gray-800 whitespace-pre-line">{log.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {flaggedSections.length > 0 && (
          <form onSubmit={handlePost} className="p-4 border-t border-gray-200 space-y-2">
            {error && <div className="text-sm text-red-700 bg-red-100 rounded-lg p-2">{error}</div>}
            <select
              value={sectionKey}
              onChange={(e) => setSectionKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {flaggedSections.map(section => (
                <option key={section.key} value={section.key}>{section.label}</option>
              ))}
            </select>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Document the corrective action taken for this section..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={posting || !text.trim()}
              className="w-full bg-blue-900 text-white py-2 rounded-lg font-medium hover:bg-blue-800 transition disabled:opacity-50"
            >
              {posting ? 'Logging...' : 'Log Corrective Action'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
