import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './lib/firebase';
import { loadProfile, ROLE_ROUTES } from './lib/scope';
import Login from './components/Login';
import AcceptInvite from './components/AcceptInvite';
import LocationManagerDash from './components/dashboards/LocationManagerDash';
import AreaManagerDash from './components/dashboards/AreaManagerDash';
import RegionAdminDash from './components/dashboards/RegionAdminDash';
import AccreditationSpecialistDash from './components/dashboards/AccreditationSpecialistDash';
import './App.css';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Gates a dashboard on BOTH authentication and role. Checking only that
// someone is signed in is not access control here: every dashboard reads a
// different slice of company data, so a Location Manager who simply typed
// /accreditation used to get the company-wide view. Firestore rules enforce
// the same boundary server-side; this is what keeps the UI honest about it.
function ProtectedRoute({ allow, children }) {
  const [state, setState] = useState({ status: 'loading', profile: null });

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = auth.onAuthStateChanged(async currentUser => {
      if (!currentUser) {
        if (!cancelled) setState({ status: 'anonymous', profile: null });
        return;
      }
      try {
        const profile = await loadProfile(currentUser.uid);
        if (!cancelled) {
          setState(profile ? { status: 'ready', profile } : { status: 'no-profile', profile: null });
        }
      } catch {
        // A profile read that fails (offline, rules) is not an authorisation
        // to proceed — fall back to the login screen.
        if (!cancelled) setState({ status: 'anonymous', profile: null });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (state.status === 'loading') return <LoadingScreen />;
  if (state.status === 'anonymous') return <Navigate to="/" replace />;

  if (state.status === 'no-profile') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-800 font-semibold mb-2">This account isn&apos;t set up yet.</p>
          <p className="text-sm text-gray-600">
            Contact your Region Admin or Accreditation Specialist to have your access configured.
          </p>
        </div>
      </div>
    );
  }

  const { role } = state.profile;
  if (!allow.includes(role)) {
    // Send people to their own dashboard rather than a dead end. An unknown
    // role has no dashboard to go to, so it lands back on the login screen.
    return <Navigate to={ROLE_ROUTES[role] || '/'} replace />;
  }

  return children;
}

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route
          path="/location-manager"
          element={
            <ProtectedRoute allow={['locationManager']}>
              <LocationManagerDash />
            </ProtectedRoute>
          }
        />
        <Route
          path="/area-manager"
          element={
            <ProtectedRoute allow={['areaManager']}>
              <AreaManagerDash />
            </ProtectedRoute>
          }
        />
        <Route
          path="/region-admin"
          element={
            <ProtectedRoute allow={['regionAdmin']}>
              <RegionAdminDash />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accreditation"
          element={
            <ProtectedRoute allow={['accreditationSpecialist']}>
              <AccreditationSpecialistDash />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
