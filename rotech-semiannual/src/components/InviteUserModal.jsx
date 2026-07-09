import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const ROLE_LABELS = {
  locationManager: 'Location Manager',
  areaManager: 'Area Manager',
  regionAdmin: 'Region Admin',
  accreditationSpecialist: 'Accreditation Specialist',
};

const INVITE_BASE_URL = `${typeof window !== 'undefined' ? window.location.origin : ''}/rotech-semiannual/accept-invite`;

export default function InviteUserModal({
  inviterUid,
  inviterEmail,
  inviterRole,
  availableRoles,
  regions = [],
  areaManagers = [],
  locations = [],
  onClose,
  onCreated,
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(availableRoles[0]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedAreaManagerId, setSelectedAreaManagerId] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    let locationId = null, areaId = null, regionId = null;

    if (role === 'locationManager') {
      const loc = locations.find(l => l.id === selectedLocationId);
      if (!loc) { setError('Select a location.'); return; }
      locationId = loc.id;
      areaId = loc.areaId;
      regionId = loc.regionId;
    } else if (role === 'areaManager') {
      const am = areaManagers.find(a => a.id === selectedAreaManagerId);
      if (!am) { setError('Select an area.'); return; }
      areaId = am.areaId;
      regionId = am.regionId;
    } else if (role === 'regionAdmin') {
      if (!selectedRegionId) { setError('Select a region.'); return; }
      regionId = selectedRegionId;
    }

    setSaving(true);
    try {
      const token = crypto.randomUUID();
      const payload = {
        email: email.trim().toLowerCase(),
        role,
        locationId,
        areaId,
        regionId,
        invitedByUid: inviterUid,
        invitedByEmail: inviterEmail,
        invitedByRole: inviterRole,
        status: 'pending',
        createdAt: serverTimestamp(),
        acceptedAt: null,
      };
      await setDoc(doc(db, 'invites', token), payload);
      setInviteLink(`${INVITE_BASE_URL}?token=${token}`);
      if (onCreated) onCreated({ id: token, ...payload });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Invite User</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Invite created for <strong>{email}</strong>. Send them this link (it's only usable once):
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition whitespace-nowrap"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@rotech.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => { setRole(e.target.value); setSelectedLocationId(''); setSelectedAreaManagerId(''); setSelectedRegionId(''); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {availableRoles.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>

            {role === 'locationManager' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Location --</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.lawsonNumber} - {loc.name}, {loc.city} {loc.state}</option>
                  ))}
                </select>
              </div>
            )}

            {role === 'areaManager' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                <select
                  value={selectedAreaManagerId}
                  onChange={(e) => setSelectedAreaManagerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Area --</option>
                  {areaManagers.map(am => (
                    <option key={am.id} value={am.id}>{am.regionId} {am.areaId} - {am.name}</option>
                  ))}
                </select>
              </div>
            )}

            {role === 'regionAdmin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <select
                  value={selectedRegionId}
                  onChange={(e) => setSelectedRegionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Region --</option>
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>{r.id} - {r.name}</option>
                  ))}
                </select>
              </div>
            )}

            {error && <div className="text-sm text-red-700 bg-red-100 rounded-lg p-2">{error}</div>}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-900 text-white py-2 rounded-lg font-medium hover:bg-blue-800 transition disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Invite'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
