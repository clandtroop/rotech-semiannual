import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const ROLE_ROUTES = {
  locationManager: '/location-manager',
  areaManager: '/area-manager',
  regionAdmin: '/region-admin',
  accreditationSpecialist: '/accreditation',
};

const ROLE_LABELS = {
  locationManager: 'Location Manager',
  areaManager: 'Area Manager',
  regionAdmin: 'Region Admin',
  accreditationSpecialist: 'Accreditation Specialist',
};

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        setLoadError('This invite link is missing its token.');
        setLoading(false);
        return;
      }
      try {
        const inviteDoc = await getDoc(doc(db, 'invites', token));
        if (!inviteDoc.exists()) {
          setLoadError('This invite link is invalid.');
        } else {
          const data = inviteDoc.data();
          if (data.status !== 'pending') {
            setLoadError('This invite has already been used or was revoked.');
          } else {
            setInvite(data);
          }
        }
      } catch (err) {
        setLoadError('Could not load this invite: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (password.length < 6) {
      setSubmitError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, invite.email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        email: invite.email,
        role: invite.role,
        locationId: invite.locationId,
        areaId: invite.areaId,
        regionId: invite.regionId,
        inviteToken: token,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'invites', token), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
      });

      navigate(ROLE_ROUTES[invite.role] || '/location-manager');
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-blue-900 mb-2">Rotech Healthcare</div>
          <div className="text-lg text-gray-600">Location Readiness Platform</div>
        </div>

        {loading ? (
          <p className="text-center text-gray-600">Loading invite...</p>
        ) : loadError ? (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg text-sm text-center">
            {loadError}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
              Setting up an account for <strong>{invite.email}</strong> as{' '}
              <strong>{ROLE_LABELS[invite.role] || invite.role}</strong>.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {submitError && (
              <div className="p-3 rounded-lg text-sm bg-red-100 text-red-700">{submitError}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-900 text-white py-2 rounded-lg font-medium hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
