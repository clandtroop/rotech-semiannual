import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './lib/firebase';
import Login from './components/Login';
import LocationManagerDash from './components/dashboards/LocationManagerDash';
import AreaManagerDash from './components/dashboards/AreaManagerDash';
import RegionAdminDash from './components/dashboards/RegionAdminDash';
import './App.css';

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(currentUser => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/" />;
}

function App() {
  return (
    <Router basename="/rotech-semiannual/">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route 
          path="/location-manager" 
          element={
            <ProtectedRoute>
              <LocationManagerDash />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/area-manager" 
          element={
            <ProtectedRoute>
              <AreaManagerDash />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/region-admin" 
          element={
            <ProtectedRoute>
              <RegionAdminDash />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/accreditation" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
                  <h1 className="text-2xl font-bold text-gray-800">Accreditation Specialist Dashboard</h1>
                  <p className="text-gray-600 mt-2">Full read/write access to all locations and regions - Coming in Phase 2...</p>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
