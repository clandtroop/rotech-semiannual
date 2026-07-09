import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import OP541Form from '../forms/OP541Form';
import OP512Form from '../forms/OP512Form';
import JC427Form from '../forms/JC427Form';
import CommentThread from '../CommentThread';
import CorrectiveActionModal from '../CorrectiveActionModal';
import { getFlaggedSections } from '../../utils/correctiveActions';

export default function LocationManagerDash() {
  const [user, setUser] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [activeThread, setActiveThread] = useState(null); // assessmentType string
  const [correctiveTarget, setCorrectiveTarget] = useState(null);
  const [quarter, setQuarter] = useState('Q1-Q2 2026');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          navigate('/');
          return;
        }

        setUser(currentUser);

        // Get user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();

        if (!userData || !userData.locationId) {
          alert('Location not assigned. Contact your administrator.');
          return;
        }

        // Get location data
        const locationDoc = await getDoc(doc(db, 'locations', userData.locationId));
        const locData = locationDoc.data() || {
          lawsonNumber: userData.locationId,
          name: 'Loading...',
          city: '',
          state: '',
        };

        setLocationData(locData);

        // Get existing submissions for this location
        const q = query(
          collection(db, 'assessments'),
          where('locationId', '==', userData.locationId),
          where('quarter', '==', quarter)
        );
        const querySnapshot = await getDocs(q);
        
        const submissionsMap = {};
        querySnapshot.forEach(doc => {
          const data = doc.data();
          submissionsMap[data.assessmentType] = {
            ...data,
            id: doc.id
          };
        });
        setSubmissions(submissionsMap);

        // Get comment counts for this location's submissions this quarter
        const commentsQuery = query(
          collection(db, 'submission_comments'),
          where('locationId', '==', userData.locationId),
          where('quarter', '==', quarter)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        const counts = {};
        commentsSnapshot.forEach(doc => {
          const { assessmentType } = doc.data();
          counts[assessmentType] = (counts[assessmentType] || 0) + 1;
        });
        setCommentCounts(counts);
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading location data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [navigate, quarter]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      alert('Error signing out: ' + error.message);
    }
  };

  const handleFormSubmitSuccess = () => {
    // Reload submissions after successful submit
    const timer = setTimeout(() => {
      setSelectedForm(null);
      // Reload submissions
      window.location.reload();
    }, 2000);
  };

  const FORM_CARD_CONFIG = {
    OP541: { title: 'OP 541', subtitle: 'Facility Readiness Assessment', meta: '~45 items • 15-20 minutes', accent: 'border-blue-900', text: 'text-blue-900', button: 'bg-blue-900 hover:bg-blue-800' },
    OP512: { title: 'OP 512', subtitle: 'Facility Safety Inspection', meta: '32 items • 10-15 minutes', accent: 'border-orange-600', text: 'text-orange-600', button: 'bg-orange-600 hover:bg-orange-700' },
    JC427: { title: 'JC 427', subtitle: 'Personnel Records Review', meta: '~30 items • 15-20 minutes', accent: 'border-green-700', text: 'text-green-700', button: 'bg-green-700 hover:bg-green-800' },
  };

  const renderStatusCard = (type, title, subtitle) => {
    const sub = submissions[type];
    const rejected = sub?.status === 'rejected';
    const flagged = sub ? getFlaggedSections(sub) : [];

    const borderClass = rejected ? 'border-red-500 bg-red-50' : sub ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50';
    const badgeClass = rejected ? 'bg-red-200 text-red-800' : sub ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800';
    const badgeLabel = rejected ? '✕ Rejected' : sub ? '✓ Submitted' : 'Pending';

    return (
      <div key={type} className={`border-l-4 rounded-lg p-4 ${borderClass}`}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>
          <span className={`text-sm font-bold px-2 py-1 rounded ${badgeClass}`}>{badgeLabel}</span>
        </div>
        {sub && (
          <>
            <p className="text-xs text-gray-600 mt-2">
              Submitted: {new Date(sub.submittedAt?.toDate?.()).toLocaleDateString()}
            </p>
            {rejected && sub.rejectionReason && (
              <p className="text-xs text-red-700 mt-1">Reason: {sub.rejectionReason}</p>
            )}
            <button
              type="button"
              onClick={() => setActiveThread(type)}
              className="block text-xs text-blue-700 font-medium hover:underline mt-1"
            >
              💬 View Comments ({commentCounts[type] || 0})
            </button>
            {flagged.length > 0 && (
              <button
                type="button"
                onClick={() => setCorrectiveTarget({ assessment: sub, assessmentType: type })}
                className="block text-xs text-yellow-700 font-semibold hover:underline mt-1"
              >
                ⚠ {flagged.length} section(s) need corrective action
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  const renderFormCard = (type) => {
    const config = FORM_CARD_CONFIG[type];
    const sub = submissions[type];
    const rejected = sub?.status === 'rejected';
    const locked = Boolean(sub) && !rejected;

    return (
      <div key={type} className={`bg-white rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden border-t-4 ${config.accent}`}>
        <div className="p-6">
          <h3 className={`text-lg font-bold mb-2 ${config.text}`}>{config.title}</h3>
          <p className="text-sm text-gray-600 mb-4">{config.subtitle}</p>
          <p className="text-xs text-gray-500 mb-4">{config.meta}</p>
          <button
            onClick={() => setSelectedForm(type)}
            disabled={locked}
            className={`w-full py-2 rounded-lg font-medium transition ${
              locked ? 'bg-green-100 text-green-700 cursor-not-allowed' : `${config.button} text-white`
            }`}
          >
            {locked ? '✓ Already Submitted' : rejected ? '↻ Resubmit' : 'Start Assessment'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
          <p className="mt-4 text-gray-600">Loading your location data...</p>
        </div>
      </div>
    );
  }

  if (!locationData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-red-900">Error Loading Location</h2>
          <p className="text-red-700 mt-2">Your location data could not be loaded. Please contact your administrator.</p>
          <button
            onClick={handleSignOut}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Location Readiness Platform</h1>
            <p className="text-gray-600 mt-1">Location Manager Dashboard</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSignOut}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Location Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Your Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Location Name</p>
              <p className="text-lg font-semibold text-gray-900">{locationData.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Lawson #</p>
              <p className="text-lg font-semibold text-gray-900">{locationData.lawsonNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">City, State</p>
              <p className="text-lg font-semibold text-gray-900">{locationData.city}, {locationData.state}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Assessment Period</p>
              <p className="text-lg font-semibold text-gray-900">{quarter}</p>
            </div>
          </div>
        </div>

        {/* Assessment Status Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Assessment Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderStatusCard('OP541', 'OP 541', 'Facility Readiness')}
            {renderStatusCard('OP512', 'OP 512', 'Safety Inspection')}
            {renderStatusCard('JC427', 'JC 427', 'Personnel Records')}
          </div>
        </div>

        {/* Form Selection or Form View */}
        {!selectedForm ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderFormCard('OP541')}
            {renderFormCard('OP512')}
            {renderFormCard('JC427')}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedForm(null)}
              className="text-blue-900 hover:underline font-medium"
            >
              ← Back to Assessments
            </button>

            {selectedForm === 'OP541' && (
              <OP541Form
                locationId={locationData.lawsonNumber}
                quarter={quarter}
                existingAssessment={submissions.OP541?.status === 'rejected' ? submissions.OP541 : null}
                onSubmitSuccess={handleFormSubmitSuccess}
              />
            )}
            {selectedForm === 'OP512' && (
              <OP512Form
                locationId={locationData.lawsonNumber}
                quarter={quarter}
                existingAssessment={submissions.OP512?.status === 'rejected' ? submissions.OP512 : null}
                onSubmitSuccess={handleFormSubmitSuccess}
              />
            )}
            {selectedForm === 'JC427' && (
              <JC427Form
                locationId={locationData.lawsonNumber}
                quarter={quarter}
                existingAssessment={submissions.JC427?.status === 'rejected' ? submissions.JC427 : null}
                onSubmitSuccess={handleFormSubmitSuccess}
              />
            )}
          </div>
        )}
      </div>

      {activeThread && submissions[activeThread] && (
        <CommentThread
          assessmentId={submissions[activeThread].id}
          locationId={locationData.lawsonNumber}
          assessmentType={activeThread}
          quarter={quarter}
          locationName={locationData.name}
          currentUserEmail={user?.email}
          currentUserRole="locationManager"
          onClose={() => setActiveThread(null)}
          onCountChange={(assessmentId, newCount) => setCommentCounts(prev => ({ ...prev, [activeThread]: newCount }))}
        />
      )}

      {correctiveTarget && (
        <CorrectiveActionModal
          assessment={correctiveTarget.assessment}
          locationId={locationData.lawsonNumber}
          assessmentType={correctiveTarget.assessmentType}
          quarter={quarter}
          locationName={locationData.name}
          currentUserEmail={user?.email}
          currentUserRole="locationManager"
          onClose={() => setCorrectiveTarget(null)}
        />
      )}
    </div>
  );
}
