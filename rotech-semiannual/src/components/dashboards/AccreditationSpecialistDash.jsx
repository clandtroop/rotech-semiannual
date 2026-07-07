import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function AccreditationSpecialistDash() {
  const [regions, setRegions] = useState([]);
  const [areaManagers, setAreaManagers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [quarter, setQuarter] = useState('Q1-Q2 2026');
  const [regionFilter, setRegionFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
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

        // Get all regions
        const regionSnapshot = await getDocs(collection(db, 'regions'));
        const regs = [];
        regionSnapshot.forEach(doc => regs.push({ id: doc.id, ...doc.data() }));
        setRegions(regs);

        // Get all area managers
        const amSnapshot = await getDocs(collection(db, 'area_managers'));
        const ams = [];
        amSnapshot.forEach(doc => ams.push({ id: doc.id, ...doc.data() }));
        setAreaManagers(ams);

        // Get all locations
        const locSnapshot = await getDocs(collection(db, 'locations'));
        const locs = [];
        locSnapshot.forEach(doc => locs.push({ id: doc.id, ...doc.data() }));
        setLocations(locs);

        // Get all submissions for this quarter
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
    alert('Export to Excel feature coming in Phase 2. Data will include:\n\n✓ All location submissions by region\n✓ Completion metrics\n✓ Trends & historical data\n✓ Deficiency tracking');
  };

  const getLocationStatus = (locationId) => {
    const op541 = submissions[`${locationId}_OP541`];
    const op512 = submissions[`${locationId}_OP512`];
    const jc427 = submissions[`${locationId}_JC427`];

    if (op541 && op512 && jc427) return 'complete';
    if (op541 || op512 || jc427) return 'partial';
    return 'pending';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'complete': return { bg: 'bg-green-200', text: 'text-green-800', label: '✓ Complete' };
      case 'partial': return { bg: 'bg-yellow-200', text: 'text-yellow-800', label: '⊙ Partial' };
      default: return { bg: 'bg-gray-200', text: 'text-gray-800', label: 'Pending' };
    }
  };

  const getRegionStatus = (regionId) => {
    const regionLocs = locations.filter(loc => loc.regionId === regionId);
    if (regionLocs.length === 0) return { complete: 0, partial: 0, pending: 0, total: 0 };

    let complete = 0, partial = 0, pending = 0;
    regionLocs.forEach(loc => {
      const status = getLocationStatus(loc.id);
      if (status === 'complete') complete++;
      else if (status === 'partial') partial++;
      else pending++;
    });

    return { complete, partial, pending, total: regionLocs.length };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
          <p className="mt-4 text-gray-600">Loading accreditation data...</p>
        </div>
      </div>
    );
  }

  // System-wide metrics
  const totalLocations = locations.length;
  let totalComplete = 0, totalPartial = 0, totalPending = 0;
  locations.forEach(loc => {
    const status = getLocationStatus(loc.id);
    if (status === 'complete') totalComplete++;
    else if (status === 'partial') totalPartial++;
    else totalPending++;
  });
  const completionRate = totalLocations > 0 ? Math.round((totalComplete / totalLocations) * 100) : 0;

  // Filtered locations for the detail table
  const areasForRegion = regionFilter === 'all'
    ? areaManagers
    : areaManagers.filter(am => am.regionId === regionFilter);

  const filteredLocations = locations.filter(loc => {
    if (regionFilter !== 'all' && loc.regionId !== regionFilter) return false;
    if (areaFilter !== 'all' && `${loc.regionId}_${loc.areaId}` !== areaFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Accreditation Specialist Dashboard</h1>
            <p className="text-gray-600 mt-1">Full read/write access to all locations and regions</p>
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

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option>Q1-Q2 2026</option>
            <option>Q3-Q4 2026</option>
          </select>
          <select
            value={regionFilter}
            onChange={(e) => { setRegionFilter(e.target.value); setAreaFilter('all'); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Regions</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Areas</option>
            {areasForRegion.map(am => (
              <option key={am.id} value={am.id}>
                {regionFilter === 'all' ? `${am.regionId} ${am.areaId} - ${am.name}` : `${am.areaId} - ${am.name}`}
              </option>
            ))}
          </select>
        </div>

        {/* Region Summary */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Region Summary</h2>
          </div>

          {regions.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              No regions found. Run the data import to populate regions, area managers, and locations.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Region</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Director</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Locations</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Complete</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Partial</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Pending</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Completion %</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((region) => {
                    const status = getRegionStatus(region.id);
                    const pct = status.total > 0 ? Math.round((status.complete / status.total) * 100) : 0;

                    return (
                      <tr key={region.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{region.name}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{region.directorName}</div>
                          <div className="text-sm text-gray-600">{region.directorEmail}</div>
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

        {/* All Locations Detail */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Location Detail</h2>
            <span className="text-sm text-gray-600">{filteredLocations.length} location{filteredLocations.length === 1 ? '' : 's'}</span>
          </div>

          {filteredLocations.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              No locations match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Lawson #</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">City, State</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Region / Area</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">OP 541</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">OP 512</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">JC 427</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.map((location) => {
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
                        <td className="px-6 py-4 text-sm text-gray-600">{location.regionId} / {location.areaId}</td>
                        <td className="px-6 py-4 text-center">
                          {op541 ? (
                            <span className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">✓</span>
                          ) : (
                            <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {op512 ? (
                            <span className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">✓</span>
                          ) : (
                            <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {jc427 ? (
                            <span className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">✓</span>
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

        {/* Feature Status Card */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mt-8">
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
              <span><strong>Edit Access:</strong> Direct edit of location, area manager, and region records</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
