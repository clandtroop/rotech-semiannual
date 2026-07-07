import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const OP541_ITEMS = [
  { id: '1.1.14', label: 'Joint Commission contact sign posted in public view (JC 434)' },
  { id: '1.1.4', label: 'All licenses, certificates, and permits posted in area accessible to patients' },
  { id: '1.1.12', label: 'Hours of operation are posted' },
  { id: '2.3.1', label: 'Posted front door assistance sign for equipment returns (OP 554)' },
  { id: '2.2.1', label: 'No Pets Allowed sign posted on/near entrance to facility (OP 555)' },
  { id: '2.4.2', label: '"No Firearms" signs hanging on/near front entrance (English & Spanish)' },
  { id: '1.1.23', label: 'Patient Safety Goals Poster visible in location (JC 428)' },
  { id: '1.1.4a', label: 'Field Management Organization Chart posted (OP 201)' },
  { id: '2.2.4', label: 'Safety Culture Poster hung in employee area (RM 1246)' },
  { id: '2.4.14', label: 'Workplace Violence Prevention Plan (OP 524) posted in each employee work area' },
  { id: '2.4.13', label: 'Evacuation plan posted (includes smoke alarms, fire extinguishers & assembly point)' },
  { id: '2.4.13a', label: 'Smoke alarms present and checks documented on FDA 001' },
  { id: '2.2.28', label: 'Temperature sensitive supplies stored per manufacturer requirement' },
  { id: '2.4.13b', label: 'Fire extinguisher present and monthly checks documented' },
  { id: '2.4.13c', label: 'Record of annual fire extinguisher recharge' },
  { id: '2.2.1a', label: 'Exits identified and accessible (no obstructions)' },
  { id: '6.4.2', label: 'Compliant with all HIPAA regulations' },
  { id: '2.2.1b', label: 'Facility is clean and organized' },
  { id: '2.3.1a', label: 'Hand gel readily available for employees and patients in all areas' },
  { id: '2.4.2a', label: 'Expired Mada Products removed (hand gel, wipes, spray)' },
  { id: '2.3.1b', label: 'Hand washing guidelines posted in all restrooms (OP 503)' },
  { id: '2.3.1c', label: 'Antimicrobial soap in restroom (non-refillable)' },
  { id: '2.2.1c', label: 'PPE and first aid kits (without expired products) available' },
  { id: '2.2.5', label: 'Equipment managed in designated/segregated areas of warehouse' },
  { id: '2.2.10', label: 'Wheelchairs and POVs cleaned with Steri-Fab (where required)' },
  { id: '2.2.10a', label: 'OP 763 Disinfection Log completed documenting wheelchair cleaning (where required)' },
  { id: '2.2.5a', label: 'Equipment is properly clear bagged & green tagged if patient ready' },
  { id: '2.2.5b', label: 'Dirty equipment is in non-clear bags & red tagged if not decontaminated' },
  { id: '2.2.5c', label: 'Green tags are filled in correctly with maintenance date/initials' },
  { id: '2.2.5d', label: 'Red tags are filled in if equipment decontaminated or needs repair' },
  { id: '2.5.17', label: 'Oxygen cylinders stored safely in location - NO FREE STANDING CYLINDERS' },
  { id: '2.5.17a', label: 'Warehouse Inventory Forms for cylinders (FDA 011) and LOX (FDA 023) complete' },
  { id: '2.1.28', label: 'Rental equipment with battery back-up charging (Check all ventilators)' },
  { id: '2.2.4a', label: 'Oxygen analyzer calibrated per mfg. guidelines' },
  { id: '2.2.5e', label: 'Apnea monitor simulator calibrated per mfg. guidelines' },
  { id: '2.4.2b', label: 'Expired products removed' },
  { id: '2.4.11', label: 'Secondary containers appropriately labeled (use RM 1239)' },
  { id: '2.2.10b', label: 'Approved disinfectant in cleaning area' },
  { id: '2.2.5f', label: '"Oxygen Only" tools are labeled and segregated' },
  { id: '2.2.1d', label: 'Eyewash present/updated - close proximity to cleaning area' },
  { id: '2.5.17b', label: '"No Smoking" signs posted (oxygen storage area)' },
  { id: '2.5.17c', label: '"Authorized Personnel Only" signs posted (oxygen storage area)' },
  { id: '2.4.15', label: 'Maintain OP 535 for work areas at risk of high temperature' },
  { id: '1.1.22', label: 'Patient perception of care survey reports reviewed quarterly' },
  { id: '1.1.22a', label: 'Referral source perception of care survey reports reviewed annually' },
  { id: '1.1.22b', label: 'Metrics report printed from Tableau and reviewed monthly' },
  { id: '1.1.22c', label: '20 EMR audits (OP 540) completed semi-annually' },
  { id: '2.1.53', label: 'Following all state requirements as per CL 302 State Clinical Requirements' },
];

export default function OP541Form({ locationId, quarter, onSubmitSuccess }) {
  const [responses, setResponses] = useState({});
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  const handleResponseChange = (itemId, value) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitStatus('');

    try {
      // Validate that all items are answered
      const unanswered = OP541_ITEMS.filter(item => !responses[item.id]);
      if (unanswered.length > 0) {
        setSubmitStatus(`Please answer all ${unanswered.length} remaining items before submitting.`);
        setLoading(false);
        return;
      }

      // Save to Firestore
      const assessmentRef = await addDoc(collection(db, 'assessments'), {
        locationId: locationId,
        assessmentType: 'OP541',
        quarter: quarter,
        status: 'submitted',
        submittedAt: serverTimestamp(),
        responses: responses,
        comments: comments,
      });

      setSubmitStatus('✓ Assessment submitted successfully!');
      setResponses({});
      setComments('');

      // Call parent callback
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }

      setTimeout(() => setSubmitStatus(''), 5000);
    } catch (error) {
      setSubmitStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const completionPercentage = Math.round((Object.keys(responses).length / OP541_ITEMS.length) * 100);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">OP 541 - Facility Readiness</h2>
        <p className="text-gray-600 mb-4">{quarter} Assessment | Location: {locationId}</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-900 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">{completionPercentage}% Complete ({Object.keys(responses).length} of {OP541_ITEMS.length})</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Items */}
        {OP541_ITEMS.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">
                  <span className="font-semibold text-blue-900">{item.id}:</span> {item.label}
                </label>
              </div>
              <select
                value={responses[item.id] || ''}
                onChange={(e) => handleResponseChange(item.id, e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select --</option>
                <option value="yes">✓ Yes</option>
                <option value="no">✗ No</option>
                <option value="na">N/A</option>
              </select>
            </div>
          </div>
        ))}

        {/* Comments */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comments (Optional)
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add any additional notes or observations..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows="4"
          />
        </div>

        {/* Submit Status */}
        {submitStatus && (
          <div className={`p-3 rounded-lg text-sm ${
            submitStatus.includes('✓') 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {submitStatus}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || completionPercentage < 100}
          className="w-full bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Assessment'}
        </button>
      </form>
    </div>
  );
}
