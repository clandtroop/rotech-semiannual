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

// Firebase's own floor is 6 characters, which is well under any corporate
// password standard. The invite flow is the only place this app sets a
// password, so this is where the policy has to live.
const MIN_PASSWORD_LENGTH = 12;

function passwordProblem(pw) {
  if (pw.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) {
    return 'Password must include both uppercase and lowercase letters.';
  }
  if (!/[0-9]/.test(pw)) {
    return 'Password must include at least one number.';
  }
  return '';
}

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
          const expiresAt = data.expiresAt?.toDate?.();
          if (data.status !== 'pending') {
            setLoadError('This invite has already been used or was revoked.');
          } else if (!expiresAt || expiresAt <= new Date()) {
            // Also enforced in firestore.rules — this is just the friendly
            // version of the rejection the server would issue anyway.
            setLoadError('This invite link has expired. Ask your administrator to send a new one.');
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

    const problem = passwordProblem(password);
    if (problem) {
      setSubmitError(problem);
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
              <p className="text-xs text-gray-500 mb-2">
                At least {MIN_PASSWORD_LENGTH} characters, with upper and lower case letters and a number.
              </p>
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
