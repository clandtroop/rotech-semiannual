import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const LOGIN_ERROR_MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact your administrator.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a moment and try again.',
};

const RESET_ERROR_MESSAGES = {
  'auth/user-not-found': 'No account found with that email.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user role from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userRole = userDoc.data()?.role || 'locationManager';

      // Redirect based on role
      switch (userRole) {
        case 'locationManager':
          navigate('/location-manager');
          break;
        case 'areaManager':
          navigate('/area-manager');
          break;
        case 'regionAdmin':
          navigate('/region-admin');
          break;
        case 'accreditationSpecialist':
          navigate('/accreditation');
          break;
        default:
          navigate('/location-manager');
      }
    } catch (err) {
      setError(LOGIN_ERROR_MESSAGES[err.code] || 'Something went wrong signing in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetMessage('');

    if (!email.trim()) {
      setError('Enter your email address above, then click "Forgot password?" again.');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetMessage(`Password reset email sent to ${email.trim()}. Check your inbox (and spam folder).`);
    } catch (err) {
      setError(RESET_ERROR_MESSAGES[err.code] || 'Something went wrong sending the reset email. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-blue-900 mb-2">Rotech Healthcare</div>
          <div className="text-lg text-gray-600">Location Readiness Platform</div>
          <div className="md:flex-wrap items-baseline gap-2 text-x1 font-bold mb-2">
              <span className="text-blue-900">Accreditation </span>
              <span className="text-green-900">= $$$</span>
              <span className="text-blue-900">  For Services Rendered</span>
    </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@rotech.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-sm text-blue-700 hover:text-blue-900 hover:underline disabled:opacity-50"
              >
                {resetLoading ? 'Sending...' : 'Forgot password?'}
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Reset Confirmation */}
          {resetMessage && (
            <div className="p-3 rounded-lg text-sm bg-green-100 text-green-700">
              {resetMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg text-sm bg-red-100 text-red-700">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 text-white py-2 rounded-lg font-medium hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Accounts are created by invitation only. Contact your Regions Admin or Accreditation Specialist if you need access.
        </div>

        <div className="mt-4 text-center">
          <a
            href="/rotech-semiannual/sop.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-700 hover:text-blue-900 hover:underline font-medium"
          >
            📋 View Standard Operating Procedures (printable)
          </a>
        </div>
      </div>
    </div>
  );
}
