import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const OP512_ITEMS = [
  { id: '1', label: 'Work areas clean?' },
  { id: '2', label: 'Garbage and other wastes removed from work area?' },
  { id: '3', label: 'Housekeeping maintained?' },
  { id: '4', label: 'Eating area clean?' },
  { id: '5', label: 'Restrooms clean and sanitary?' },
  { id: '6', label: 'Aisles free from obstruction?' },
  { id: '7', label: 'Floor mats flat to the floor surface?' },
  { id: '8', label: 'All outlets grounded?' },
  { id: '9', label: 'Covers missing on electrical fuse and outlet boxes?' },
  { id: '10', label: '3 ft. clearance around all electrical panels, transformers, or other electrical apparatus?' },
  { id: '11', label: 'Any outlets appear to be overloaded?' },
  { id: '12', label: 'Space heaters/portable fans used in a safe manner (not used near flammables)?' },
  { id: '13', label: 'Any electrical cords worn or frayed?' },
  { id: '14', label: 'Building exits adequate, properly marked and lighted?' },
  { id: '15', label: 'Exits blocked?' },
  { id: '16', label: 'Emergency lighting checked monthly and documented on FDA 001?' },
  { id: '17', label: 'Fire extinguishers mounted in accessible locations?' },
  { id: '18', label: 'Fire extinguishers inspected annually by outside vendor; date documented on attached card?' },
  { id: '19', label: 'Monthly visual inspection of fire extinguishers completed and documented on back of each card?' },
  { id: '20', label: 'Employees completed mandatory annual training in fire extinguisher operation?' },
  { id: '21', label: 'Smoke alarms installed in immediate vicinity of employee areas?' },
  { id: '22', label: 'All smoke alarm batteries replaced every 6 months?' },
  { id: '23', label: 'Documentation of annual automatic fire alarm & sprinkler system inspection available?' },
  { id: '24', label: 'Mandatory annual fire drill conducted per policy 2.4.13; employee participation documented on OP 520?' },
  { id: '25', label: 'Identified and corrected any potential fire hazards?' },
  { id: '26', label: 'Ladders have safety feet, are free from sharp edges and splinters?' },
  { id: '27', label: 'Personal Protective Equipment (PPE) available where needed?' },
  { id: '28', label: 'PPE worn or used as required (steel-toed shoes, gloves, eye protection, ear protection)?' },
  { id: '29', label: 'First aid kits available and free of oral medications (e.g., aspirin)?' },
  { id: '30', label: 'All tools and equipment in good condition?' },
  { id: '31', label: 'Oxygen tools marked and kept separate from "general use" tools?' },
  { id: '32', label: 'All electrically operated tools properly grounded or double insulated?' },
];

export default function OP512Form({ locationId, quarter, onSubmitSuccess }) {
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
      const unanswered = OP512_ITEMS.filter(item => !responses[item.id]);
      if (unanswered.length > 0) {
        setSubmitStatus(`Please answer all ${unanswered.length} remaining items before submitting.`);
        setLoading(false);
        return;
      }

      // Save to Firestore
      const assessmentRef = await addDoc(collection(db, 'assessments'), {
        locationId: locationId,
        assessmentType: 'OP512',
        quarter: quarter,
        status: 'submitted',
        submittedAt: serverTimestamp(),
        responses: responses,
        comments: comments,
      });

      setSubmitStatus('✓ Assessment submitted successfully!');
      setResponses({});
      setComments('');

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

  const completionPercentage = Math.round((Object.keys(responses).length / OP512_ITEMS.length) * 100);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">OP 512 - Facility Safety Inspection</h2>
        <p className="text-gray-600 mb-4">{quarter} Assessment | Location: {locationId}</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-orange-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">{completionPercentage}% Complete ({Object.keys(responses).length} of {OP512_ITEMS.length})</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Items */}
        {OP512_ITEMS.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">
                  <span className="font-semibold text-orange-600">{item.id}.</span> {item.label}
                </label>
              </div>
              <select
                value={responses[item.id] || ''}
                onChange={(e) => handleResponseChange(item.id, e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
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
            Inspector Comments (Optional)
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Document any deficiencies, corrective actions needed, or additional observations..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
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
          className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Assessment'}
        </button>
      </form>
    </div>
  );
}
