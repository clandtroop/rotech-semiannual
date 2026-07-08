import { useState } from 'react';

const FIELD_SCHEMAS = {
  region: [
    { key: 'regionId', label: 'Region ID', immutable: true, required: true },
    { key: 'name', label: 'Region Name', required: true },
    { key: 'directorName', label: 'Director Name', required: true },
    { key: 'directorEmail', label: 'Director Email', type: 'email', required: true },
  ],
  areaManager: [
    { key: 'regionId', label: 'Region', type: 'regionSelect', immutable: true, required: true },
    { key: 'areaId', label: 'Area ID', immutable: true, required: true, placeholder: 'e.g. A2' },
    { key: 'name', label: 'Area Manager Name', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'phone', label: 'Phone', required: false },
  ],
  location: [
    { key: 'lawsonNumber', label: 'Lawson #', immutable: true, required: true },
    { key: 'name', label: 'Location Name', required: true },
    { key: 'city', label: 'City', required: true },
    { key: 'state', label: 'State', required: true, placeholder: 'e.g. CO' },
    { key: 'regionId', label: 'Region', type: 'regionSelect', required: true },
    { key: 'areaId', label: 'Area', type: 'areaSelect', required: true },
  ],
};

const TITLES = {
  region: 'Region',
  areaManager: 'Area Manager',
  location: 'Location',
};

export default function RecordEditModal({ recordType, mode, initialData, regions, areaManagers, onSave, onClose }) {
  const [formData, setFormData] = useState(initialData || {});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fields = FIELD_SCHEMAS[recordType];
  const isEdit = mode === 'edit';

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const areaOptionsForSelectedRegion = areaManagers.filter(am => am.regionId === formData.regionId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    for (const field of fields) {
      if (field.required && !String(formData[field.key] || '').trim()) {
        setError(`${field.label} is required.`);
        return;
      }
      if (field.type === 'email' && formData[field.key] && !formData[field.key].includes('@')) {
        setError(`${field.label} must be a valid email.`);
        return;
      }
    }

    setSaving(true);
    try {
      await onSave(formData);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            {isEdit ? 'Edit' : 'Add'} {TITLES[recordType]}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            const disabled = field.immutable && isEdit;
            const value = formData[field.key] || '';

            if (field.type === 'regionSelect') {
              return (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <select
                    value={value}
                    disabled={disabled}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">-- Select Region --</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.id} - {r.name}</option>
                    ))}
                  </select>
                </div>
              );
            }

            if (field.type === 'areaSelect') {
              return (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <select
                    value={value}
                    disabled={!formData.regionId}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">{formData.regionId ? '-- Select Area --' : 'Select a region first'}</option>
                    {areaOptionsForSelectedRegion.map(am => (
                      <option key={am.id} value={am.areaId}>{am.areaId} - {am.name}</option>
                    ))}
                  </select>
                </div>
              );
            }

            return (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <input
                  type={field.type === 'email' ? 'email' : 'text'}
                  value={value}
                  disabled={disabled}
                  placeholder={field.placeholder}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            );
          })}

          {error && (
            <div className="p-3 rounded-lg text-sm bg-red-100 text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-900 text-white py-2 rounded-lg font-medium hover:bg-blue-800 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
