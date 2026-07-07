import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const JC427_SECTIONS = {
  onboarding: {
    title: 'Onboarding Documents',
    items: [
      { id: 'welcome_email', label: 'Welcome to Rotech (Okay to Hire) Email' },
      { id: 'job_description', label: 'Job Description' },
      { id: 'general_orientation', label: 'General Orientation (HR 548)' },
      { id: 'professional_licensure', label: 'Professional Licensure' },
      { id: 'drivers_license', label: "Driver's License" },
      { id: 'policy_acknowledgment', label: 'Policy Acknowledgment / Computer Password Confidentiality' },
    ]
  },
  training: {
    title: 'Training Records',
    items: [
      { id: 'mandatory_annual', label: 'Mandatory Annual In-Services (SE 800)' },
      { id: 'storage_distribution', label: 'Storage and Distribution Training (FDA 019)' },
      { id: 'manufacturing_facility', label: 'Manufacturing Facility Orientation (FDA 021)' },
      { id: 'hazard_communication', label: 'Hazard Communication Program Training (RM 1234 with RM 1238)' },
    ]
  },
  performance: {
    title: 'Performance Review',
    items: [
      { id: 'employee_review', label: 'Employee Performance Review' },
    ]
  },
  medical: {
    title: 'Medical Records',
    items: [
      { id: 'hepatitis_b', label: 'Hepatitis B Test or OP 515 Vaccination Statement' },
      { id: 'tb_test', label: 'TB Test/Risk Assessment (per state requirements)' },
      { id: 'n95_fit_test', label: 'Annual N95 Mask Fit Testing (for "at risk" employees)' },
      { id: 'respirator_clearance', label: 'Medical Clearance for Respirator Use from 3M' },
    ]
  },
  competencies: {
    title: 'Equipment Competency Assessments',
    items: [
      { id: 'aspirator', label: 'Aspirator / Suction (SE 816)' },
      { id: 'cpm', label: 'Continuous Passive Motion - CPM (SE 904)' },
      { id: 'pap_device', label: 'PAP Device (SE 811)' },
      { id: 'pap_mask', label: 'PAP Mask Fitting (SE 851)' },
      { id: 'high_pressure_cylinder', label: 'High Pressure Cylinder (SE 805)' },
      { id: 'hospital_bed', label: 'Hospital Bed & Trapeze (SE 807)' },
      { id: 'liquid_oxygen', label: 'Liquid Oxygen (SE 809)' },
      { id: 'nebulizer', label: 'Nebulizer (SE 812)' },
      { id: 'oxygen_concentrator', label: 'Oxygen Concentrator (SE 803)' },
      { id: 'wheelchair', label: 'Wheelchair (SE 824)' },
    ]
  }
};

export default function JC427Form({ locationId, quarter, onSubmitSuccess }) {
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

  const getTotalItems = () => {
    return Object.values(JC427_SECTIONS).reduce((sum, section) => sum + section.items.length, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitStatus('');

    try {
      // Get all item IDs
      const allItemIds = Object.values(JC427_SECTIONS).flatMap(section => 
        section.items.map(item => item.id)
      );

      // Validate that all items are answered
      const unanswered = allItemIds.filter(id => !responses[id]);
      if (unanswered.length > 0) {
        setSubmitStatus(`Please answer all ${unanswered.length} remaining items before submitting.`);
        setLoading(false);
        return;
      }

      // Save to Firestore
      const assessmentRef = await addDoc(collection(db, 'assessments'), {
        locationId: locationId,
        assessmentType: 'JC427',
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

  const completionPercentage = Math.round((Object.keys(responses).length / getTotalItems()) * 100);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">JC 427 - Personnel Records Review</h2>
        <p className="text-gray-600 mb-4">{quarter} Assessment | Location: {locationId}</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-700 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">{completionPercentage}% Complete ({Object.keys(responses).length} of {getTotalItems()})</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sections */}
        {Object.entries(JC427_SECTIONS).map(([sectionKey, section]) => (
          <div key={sectionKey} className="border-l-4 border-green-700 bg-green-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-4">{section.title}</h3>
            
            <div className="space-y-3">
              {section.items.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">
                        {item.label}
                      </label>
                    </div>
                    <select
                      value={responses[item.id] || ''}
                      onChange={(e) => handleResponseChange(item.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">-- Select --</option>
                      <option value="complete">✓ Complete</option>
                      <option value="incomplete">✗ Incomplete</option>
                      <option value="na">N/A</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Comments */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personnel Notes (Optional)
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Document any missing records, training needs, or follow-up actions required..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
          className="w-full bg-green-700 text-white py-3 rounded-lg font-medium hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Assessment'}
        </button>
      </form>
    </div>
  );
}
