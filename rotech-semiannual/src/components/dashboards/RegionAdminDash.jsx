import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function RegionAdminDash() {
  const [user, setUser] = useState(null);
  const [regionData, setRegionData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [areaManagers, setAreaManagers] = useState([]);
  const [submissions, setSubmissions] = useState({});
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

        if (!userData || !userData.regionId) {
          alert('Region not assigned. Contact your administrator.');
          return;
        }

        // Get region info
        const regionRef = doc(db, 'regions', userData.regionId);
        const regionDoc = await getDoc(regionRef);
        setRegionData(regionDoc.data() || { name: 'Region ' + userData.regionId });

        // Get all locations in this region
        const locQuery = query(
          collection(db, 'locations'),
          where('regionId', '==', userData.regionId)
        );
        const locSnapshot = await getDocs(locQuery);
        const locs = [];
        locSnapshot.forEach(doc => {
          locs.push({ id: doc.id, ...doc.data() });
        });
        setLocations(locs);

        // Get area managers in this region
        const amQuery = query(
          collection(db, 'area_managers'),
          where('regionId', '==', userData.regionId)
        );
        const amSnapshot = await getDocs(amQuery);
        const ams = [];
        amSnapshot.forEach(doc => {
          ams.push({ id: doc.id, ...doc.data() });
        });
        setAreaManagers(ams);

        // Get submissions for this region
        const subQuery = query(
          collection(db, 'assessments'),
          where('quarter', '==', quarter)
        );
        const subSnapshot = await getDocs(subQuery);
        const submissionsMap = {};
        subSnapshot.forEach(doc => {
          const data = doc.data();
          const key = `${data.locationId}_${data.assessmentType}`;
          submissionsMap[key] = data;
        });
        setSubmissions(submissionsMap);
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

  const handleExportToExcel = () => {
    alert('Export to Excel feature coming in Phase 2. Data will include:\n\n✓ All location submissions by area\n✓ Completion metrics\n✓ Trends & historical data\n✓ Deficiency tracking');
  };

  const getAreaStatus = (areaId) => {
    const areaLocs = locations.filter(loc => loc.areaId === areaId);
    if (areaLocs.length === 0) return { complete: 0, partial: 0, pending: 0, total: 0 };
    
    let complete = 0, partial = 0, pending = 0;
    areaLocs.forEach(loc => {
      const op541 = submissions[`${loc.id}_OP541`];
      const op512 = submissions[`${loc.id}_OP512`];
      const jc427 = submissions[`${loc.id}_JC427`];
      
      if (op541 && op512 && jc427) complete++;
      else if (op541 || op512 || jc427) partial++;
      else pending++;
    });

    return { complete, partial, pending, total: areaLocs.length };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
          <p className="mt-4 text-gray-600">Loading region data...</p>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalLocations = locations.length;
  let totalComplete = 0, totalPartial = 0, totalPending = 0;
  
  Object.values(submissions).forEach(sub => {
    if (sub.assessmentType === 'OP541') {
      const op512 = submissions[`${sub.locationId}_OP512`];
      const jc427 = submissions[`${sub.locationId}_JC427`];
      if (op512 && jc427) totalComplete++;
      else totalPartial++;
    } else if (!submissions[`${sub.locationId}_OP541`]) {
      totalPartial++;
    }
  });

  areaManagers.forEach(am => {
    const areaLocs = locations.filter(loc => loc.areaId === am.areaId);
    if (areaLocs.length > 0) {
      const status = getAreaStatus(am.areaId);
      if (status.total === 0) totalPending += areaLocs.length;
    }
  });

  const completionRate = totalLocations > 0 ? Math.round(((totalComplete) / totalLocations) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Region Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">{regionData?.name}</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleExportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              📥 Export Reports
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Locations</p>
            <p className="text-3xl font-bold text-gray-900">{totalLocations}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Complete</p>
            <p className="text-3xl font-bold text-green-700">{totalComplete}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Partial</p>
            <p className="text-3xl font-bold text-yellow-700">{totalPartial}</p>
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

        {/* Area Managers Overview */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Area Manager Summary</h2>
          </div>
          
          {areaManagers.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              No area managers assigned to this region.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Area Manager</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Locations</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Complete</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Partial</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Pending</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Completion %</th>
                  </tr>
                </thead>
                <tbody>
                  {areaManagers.map((am) => {
                    const status = getAreaStatus(am.areaId);
                    const pct = status.total > 0 ? Math.round((status.complete / status.total) * 100) : 0;

                    return (
                      <tr key={am.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{am.name}</div>
                          <div className="text-sm text-gray-600">{am.email}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-gray-900">{status.total}</td>
                        <td className="px-6 py-4 text-center text-green-700 font-semibold">{status.complete}</td>
                        <td className="px-6 py-4 text-center text-yellow-700 font-semibold">{status.partial}</td>
                        <td className="px-6 py-4 text-center text-gray-700 font-semibold">{status.pending}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="ml-2 text-sm font-semibold text-gray-700">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Feature Status Card */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">Phase 2 Enhancements</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-3 font-bold">→</span>
              <span><strong>Export Reports:</strong> Download submission data and trend analysis in Excel format</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3 font-bold">→</span>
              <span><strong>Deficiency Tracking:</strong> Log and track corrective actions by location</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3 font-bold">→</span>
              <span><strong>Trend Analysis:</strong> Historical comparisons and readiness scoring</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3 font-bold">→</span>
              <span><strong>Survey Integration:</strong> Link readiness assessments to survey prep activities</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
