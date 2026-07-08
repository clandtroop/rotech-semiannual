import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import CommentThread from '../CommentThread';

export default function AreaManagerDash() {
  const [user, setUser] = useState(null);
  const [areaData, setAreaData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [activeThread, setActiveThread] = useState(null);
  const [quarter, setQuarter] = useState('Q1-Q2 2026');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          navigate('/');
          return;
        }

        setUser(currentUser);

        // Get user profile
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();

        if (!userData || !userData.areaId) {
          alert('Area not assigned. Contact your administrator.');
          return;
        }

        // Get area manager info
        const areaRef = doc(db, 'area_managers', `${userData.regionId}_${userData.areaId}`);
        const areaDoc = await getDoc(areaRef);
        setAreaData(areaDoc.data() || { name: 'Area ' + userData.areaId });

        // Get all locations in this area
        const locQuery = query(
          collection(db, 'locations'),
          where('areaId', '==', userData.areaId)
        );
        const locSnapshot = await getDocs(locQuery);
        const locs = [];
        locSnapshot.forEach(doc => {
          locs.push({ id: doc.id, ...doc.data() });
        });
        setLocations(locs);

        // Get submissions for all locations in this area for this quarter
        const subQuery = query(
          collection(db, 'assessments'),
          where('quarter', '==', quarter)
        );
        const subSnapshot = await getDocs(subQuery);
        const submissionsMap = {};
        subSnapshot.forEach(doc => {
          const data = doc.data();
          const key = `${data.locationId}_${data.assessmentType}`;
          submissionsMap[key] = { id: doc.id, ...data };
        });
        setSubmissions(submissionsMap);

        // Get comment counts for this quarter's submissions
        const commentsQuery = query(
          collection(db, 'submission_comments'),
          where('quarter', '==', quarter)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        const counts = {};
        commentsSnapshot.forEach(doc => {
          const { assessmentId } = doc.data();
          counts[assessmentId] = (counts[assessmentId] || 0) + 1;
        });
        setCommentCounts(counts);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate, quarter]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      alert('Error signing out: ' + error.message);
    }
  };

  const getLocationStatus = (locationId) => {
    const op541 = submissions[`${locationId}_OP541`];
    const op512 = submissions[`${locationId}_OP512`];
    const jc427 = submissions[`${locationId}_JC427`];
    
    if (op541 && op512 && jc427) return 'complete';
    if (op541 || op512 || jc427) return 'partial';
    return 'pending';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'complete': return 'bg-green-50 border-green-500';
      case 'partial': return 'bg-yellow-50 border-yellow-500';
      default: return 'bg-gray-50 border-gray-300';
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'complete': return { bg: 'bg-green-200', text: 'text-green-800', label: '✓ Complete' };
      case 'partial': return { bg: 'bg-yellow-200', text: 'text-yellow-800', label: '⊙ Partial' };
      default: return { bg: 'bg-gray-200', text: 'text-gray-800', label: 'Pending' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
          <p className="mt-4 text-gray-600">Loading area data...</p>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalLocations = locations.length;
  const completeCount = locations.filter(loc => getLocationStatus(loc.id) === 'complete').length;
  const partialCount = locations.filter(loc => getLocationStatus(loc.id) === 'partial').length;
  const pendingCount = locations.filter(loc => getLocationStatus(loc.id) === 'pending').length;
  const completionRate = totalLocations > 0 ? Math.round((completeCount / totalLocations) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Area Manager Dashboard</h1>
            <p className="text-gray-600 mt-1">{areaData?.name}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Locations</p>
            <p className="text-3xl font-bold text-gray-900">{totalLocations}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Complete</p>
            <p className="text-3xl font-bold text-green-700">{completeCount}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Partial</p>
            <p className="text-3xl font-bold text-yellow-700">{partialCount}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Completion Rate</p>
            <p className="text-3xl font-bold text-blue-700">{completionRate}%</p>
          </div>
        </div>

        {/* Quarter Filter */}
        <div className="mb-6">
          <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option>Q1-Q2 2026</option>
            <option>Q3-Q4 2026</option>
          </select>
        </div>

        {/* Locations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Location Submission Status</h2>
          </div>
          
          {locations.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              No locations assigned to this area.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Lawson #</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">City, State</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">OP 541</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">OP 512</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">JC 427</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location) => {
                    const status = getLocationStatus(location.id);
                    const statusBadge = getStatusBadge(status);
                    const op541 = submissions[`${location.id}_OP541`];
                    const op512 = submissions[`${location.id}_OP512`];
                    const jc427 = submissions[`${location.id}_JC427`];

                    return (
                      <tr key={location.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{location.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{location.lawsonNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{location.city}, {location.state}</td>
                        <td className="px-6 py-4 text-center">
                          {op541 ? (
                            <button
                              type="button"
                              onClick={() => setActiveThread({ assessmentId: op541.id, locationId: location.id, assessmentType: 'OP541', locationName: location.name })}
                              className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold hover:bg-green-200"
                            >
                              💬 {commentCounts[op541.id] || 0}
                            </button>
                          ) : (
                            <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {op512 ? (
                            <button
                              type="button"
                              onClick={() => setActiveThread({ assessmentId: op512.id, locationId: location.id, assessmentType: 'OP512', locationName: location.name })}
                              className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold hover:bg-green-200"
                            >
                              💬 {commentCounts[op512.id] || 0}
                            </button>
                          ) : (
                            <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {jc427 ? (
                            <button
                              type="button"
                              onClick={() => setActiveThread({ assessmentId: jc427.id, locationId: location.id, assessmentType: 'JC427', locationName: location.name })}
                              className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold hover:bg-green-200"
                            >
                              💬 {commentCounts[jc427.id] || 0}
                            </button>
                          ) : (
                            <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block ${statusBadge.bg} ${statusBadge.text} px-2 py-1 rounded text-xs font-semibold`}>
                            {statusBadge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-gray-700">
          <p className="font-semibold text-blue-900 mb-1">Phase 2 Features Coming:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Detailed submission review & analytics</li>
            <li>Trends & historical comparisons</li>
            <li>Export reports by location</li>
          </ul>
        </div>
      </div>

      {activeThread && (
        <CommentThread
          assessmentId={activeThread.assessmentId}
          locationId={activeThread.locationId}
          assessmentType={activeThread.assessmentType}
          quarter={quarter}
          locationName={activeThread.locationName}
          currentUserEmail={user?.email}
          currentUserRole="areaManager"
          onClose={() => setActiveThread(null)}
          onCountChange={(assessmentId, newCount) => setCommentCounts(prev => ({ ...prev, [assessmentId]: newCount }))}
        />
      )}
    </div>
  );
}
