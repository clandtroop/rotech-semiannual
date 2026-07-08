import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { exportWorkbook } from '../../utils/exportToExcel';

const QUARTERS = ['Q1-Q2 2026', 'Q3-Q4 2026'];

export default function RegionAdminDash() {
  const [user, setUser] = useState(null);
  const [regionData, setRegionData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [areaManagers, setAreaManagers] = useState([]);
  const [submissionsByQuarter, setSubmissionsByQuarter] = useState({});
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

        // Get submissions for every quarter, bucketed - powers both the
        // current-quarter tables and the Trend Analysis comparison below.
        const subSnapshot = await getDocs(collection(db, 'assessments'));
        const byQuarter = {};
        subSnapshot.forEach(doc => {
          const data = doc.data();
          const key = `${data.locationId}_${data.assessmentType}`;
          (byQuarter[data.quarter] ??= {})[key] = data;
        });
        setSubmissionsByQuarter(byQuarter);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const submissions = submissionsByQuarter[quarter] || {};

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      alert('Error signing out: ' + error.message);
    }
  };

  const getLocationStatus = (locationId, subs = submissions) => {
    const op541 = subs[`${locationId}_OP541`];
    const op512 = subs[`${locationId}_OP512`];
    const jc427 = subs[`${locationId}_JC427`];

    if (op541 && op512 && jc427) return 'complete';
    if (op541 || op512 || jc427) return 'partial';
    return 'pending';
  };

  const getAreaStatus = (areaId, subs = submissions) => {
    const areaLocs = locations.filter(loc => loc.areaId === areaId);
    if (areaLocs.length === 0) return { complete: 0, partial: 0, pending: 0, total: 0 };

    let complete = 0, partial = 0, pending = 0;
    areaLocs.forEach(loc => {
      const status = getLocationStatus(loc.id, subs);
      if (status === 'complete') complete++;
      else if (status === 'partial') partial++;
      else pending++;
    });

    return { complete, partial, pending, total: areaLocs.length };
  };

  const getOverallCompletionPct = (subs) => {
    if (locations.length === 0) return 0;
    const complete = locations.filter(loc => getLocationStatus(loc.id, subs) === 'complete').length;
    return Math.round((complete / locations.length) * 100);
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

  // Trend Analysis: compares both quarters across every area in the region.
  const trendOverall = QUARTERS.map(q => ({
    quarter: q,
    pct: getOverallCompletionPct(submissionsByQuarter[q] || {}),
  }));
  const trendOverallDelta = trendOverall[1].pct - trendOverall[0].pct;

  const trendByArea = areaManagers.map(am => {
    const byQuarter = QUARTERS.map(q => {
      const status = getAreaStatus(am.areaId, submissionsByQuarter[q] || {});
      const pct = status.total > 0 ? Math.round((status.complete / status.total) * 100) : 0;
      return { quarter: q, pct };
    });
    return { am, byQuarter, delta: byQuarter[1].pct - byQuarter[0].pct };
  });

  const handleExportToExcel = async () => {
    const areaRows = areaManagers.map((am) => {
      const status = getAreaStatus(am.areaId);
      const pct = status.total > 0 ? Math.round((status.complete / status.total) * 100) : 0;
      return {
        'Area Manager': am.name,
        Email: am.email,
        'Total Locations': status.total,
        Complete: status.complete,
        Partial: status.partial,
        Pending: status.pending,
        'Completion %': pct,
      };
    });

    const locationRows = locations.map((location) => {
      const status = getLocationStatus(location.id);
      return {
        Location: location.name,
        'Lawson #': location.lawsonNumber,
        City: location.city,
        State: location.state,
        Area: location.areaId,
        'OP 541': submissions[`${location.id}_OP541`] ? 'Submitted' : 'Not Submitted',
        'OP 512': submissions[`${location.id}_OP512`] ? 'Submitted' : 'Not Submitted',
        'JC 427': submissions[`${location.id}_JC427`] ? 'Submitted' : 'Not Submitted',
        Status: status,
        Quarter: quarter,
      };
    });

    const trendRows = trendByArea.map(({ am, byQuarter, delta }) => ({
      'Area Manager': am.name,
      [`${QUARTERS[0]} %`]: byQuarter[0].pct,
      [`${QUARTERS[1]} %`]: byQuarter[1].pct,
      Delta: delta,
    }));

    const regionLabel = (regionData?.name || 'Region').replace(/\s+/g, '_');
    await exportWorkbook(
      [
        { name: 'Area Summary', rows: areaRows },
        { name: 'Location Detail', rows: locationRows },
        { name: 'Trend Analysis', rows: trendRows },
      ],
      `Rotech_${regionLabel}_Report_${quarter.replace(/\s+/g, '_')}.xlsx`
    );
  };

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

        {/* Trend Analysis */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-lg font-bold text-gray-800">Trend Analysis: {QUARTERS[0]} vs {QUARTERS[1]}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-blue-600" /> {QUARTERS[0]}</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-indigo-600" /> {QUARTERS[1]}</span>
            </div>
          </div>

          <div className="p-6">
            {/* Headline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-600">
                <p className="text-sm text-gray-600">{QUARTERS[0]} Completion</p>
                <p className="text-3xl font-bold text-blue-700">{trendOverall[0].pct}%</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4 border-l-4 border-indigo-600">
                <p className="text-sm text-gray-600">{QUARTERS[1]} Completion</p>
                <p className="text-3xl font-bold text-indigo-700">{trendOverall[1].pct}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-400 flex flex-col justify-center">
                <p className="text-sm text-gray-600">Region Change</p>
                <p className={`text-3xl font-bold ${trendOverallDelta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {trendOverallDelta >= 0 ? '▲' : '▼'} {Math.abs(trendOverallDelta)} pts
                </p>
              </div>
            </div>

            {/* Per-area rows */}
            {areaManagers.length === 0 ? (
              <p className="text-center text-gray-600">No area managers assigned to this region.</p>
            ) : (
              <div className="space-y-4">
                {trendByArea.map(({ am, byQuarter, delta }) => (
                  <div key={am.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{am.name}</span>
                      <span className={`text-sm font-semibold ${delta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} pts
                      </span>
                    </div>
                    <div className="space-y-1">
                      {byQuarter.map(({ quarter: q, pct }, i) => (
                        <div key={q} className="flex items-center gap-2">
                          <span className="w-24 text-xs text-gray-500 flex-shrink-0">{q}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-indigo-600'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-12 text-xs font-semibold text-gray-700 text-right">{pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Feature Status Card */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">Phase 2 Enhancements</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-3 font-bold">→</span>
              <span><strong>Deficiency Tracking:</strong> Log and track corrective actions by location</span>
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
