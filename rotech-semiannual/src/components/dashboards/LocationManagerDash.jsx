import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import OP541Form from './forms/OP541Form';
import OP512Form from './forms/OP512Form';
import JC427Form from './forms/JC427Form';

export default function LocationManagerDash() {
  const [user, setUser] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [submissions, setSubmissions] = useState({});
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

  const handleAccessSurveyPrep = () => {
    window.open('https://clandtroop.github.io/rotech-survey-prep/', '_blank');
  };

  const handleFormSubmitSuccess = () => {
    // Reload submissions after successful submit
    const timer = setTimeout(() => {
      setSelectedForm(null);
      // Reload submissions
      window.location.reload();
    }, 2000);
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
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Location Readiness Platform</h1>
            <p className="text-gray-600 mt-1">Location Manager Dashboard</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleAccessSurveyPrep}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              📋 Access Survey Prep App
            </button>
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
            {/* OP 541 */}
            <div className={`border-l-4 rounded-lg p-4 ${
              submissions.OP541 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 bg-gray-50'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800">OP 541</h3>
                  <p className="text-sm text-gray-600">Facility Readiness</p>
                </div>
                <span className={`text-sm font-bold px-2 py-1 rounded ${
                  submissions.OP541
                    ? 'bg-green-200 text-green-800'
                    : 'bg-yellow-200 text-yellow-800'
                }`}>
                  {submissions.OP541 ? '✓ Submitted' : 'Pending'}
                </span>
              </div>
              {submissions.OP541 && (
                <p className="text-xs text-gray-600 mt-2">
                  Submitted: {new Date(submissions.OP541.submittedAt?.toDate?.()).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* OP 512 */}
            <div className={`border-l-4 rounded-lg p-4 ${
              submissions.OP512 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 bg-gray-50'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800">OP 512</h3>
                  <p className="text-sm text-gray-600">Safety Inspection</p>
                </div>
                <span className={`text-sm font-bold px-2 py-1 rounded ${
                  submissions.OP512
                    ? 'bg-green-200 text-green-800'
                    : 'bg-yellow-200 text-yellow-800'
                }`}>
                  {submissions.OP512 ? '✓ Submitted' : 'Pending'}
                </span>
              </div>
              {submissions.OP512 && (
                <p className="text-xs text-gray-600 mt-2">
                  Submitted: {new Date(submissions.OP512.submittedAt?.toDate?.()).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* JC 427 */}
            <div className={`border-l-4 rounded-lg p-4 ${
              submissions.JC427 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 bg-gray-50'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800">JC 427</h3>
                  <p className="text-sm text-gray-600">Personnel Records</p>
                </div>
                <span className={`text-sm font-bold px-2 py-1 rounded ${
                  submissions.JC427
                    ? 'bg-green-200 text-green-800'
                    : 'bg-yellow-200 text-yellow-800'
                }`}>
                  {submissions.JC427 ? '✓ Submitted' : 'Pending'}
                </span>
              </div>
              {submissions.JC427 && (
                <p className="text-xs text-gray-600 mt-2">
                  Submitted: {new Date(submissions.JC427.submittedAt?.toDate?.()).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form Selection or Form View */}
        {!selectedForm ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* OP 541 Card */}
            <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden border-t-4 border-blue-900">
              <div className="p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-2">OP 541</h3>
                <p className="text-sm text-gray-600 mb-4">Facility Readiness Assessment</p>
                <p className="text-xs text-gray-500 mb-4">~45 items • 15-20 minutes</p>
                <button
                  onClick={() => setSelectedForm('OP541')}
                  disabled={submissions.OP541}
                  className={`w-full py-2 rounded-lg font-medium transition ${
                    submissions.OP541
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : 'bg-blue-900 text-white hover:bg-blue-800'
                  }`}
                >
                  {submissions.OP541 ? '✓ Already Submitted' : 'Start Assessment'}
                </button>
              </div>
            </div>

            {/* OP 512 Card */}
            <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden border-t-4 border-orange-600">
              <div className="p-6">
                <h3 className="text-lg font-bold text-orange-600 mb-2">OP 512</h3>
                <p className="text-sm text-gray-600 mb-4">Facility Safety Inspection</p>
                <p className="text-xs text-gray-500 mb-4">32 items • 10-15 minutes</p>
                <button
                  onClick={() => setSelectedForm('OP512')}
                  disabled={submissions.OP512}
                  className={`w-full py-2 rounded-lg font-medium transition ${
                    submissions.OP512
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  {submissions.OP512 ? '✓ Already Submitted' : 'Start Assessment'}
                </button>
              </div>
            </div>

            {/* JC 427 Card */}
            <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden border-t-4 border-green-700">
              <div className="p-6">
                <h3 className="text-lg font-bold text-green-700 mb-2">JC 427</h3>
                <p className="text-sm text-gray-600 mb-4">Personnel Records Review</p>
                <p className="text-xs text-gray-500 mb-4">~30 items • 15-20 minutes</p>
                <button
                  onClick={() => setSelectedForm('JC427')}
                  disabled={submissions.JC427}
                  className={`w-full py-2 rounded-lg font-medium transition ${
                    submissions.JC427
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : 'bg-green-700 text-white hover:bg-green-800'
                  }`}
                >
                  {submissions.JC427 ? '✓ Already Submitted' : 'Start Assessment'}
                </button>
              </div>
            </div>
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
                onSubmitSuccess={handleFormSubmitSuccess}
              />
            )}
            {selectedForm === 'OP512' && (
              <OP512Form 
                locationId={locationData.lawsonNumber} 
                quarter={quarter}
                onSubmitSuccess={handleFormSubmitSuccess}
              />
            )}
            {selectedForm === 'JC427' && (
              <JC427Form 
                locationId={locationData.lawsonNumber} 
                quarter={quarter}
                onSubmitSuccess={handleFormSubmitSuccess}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
