import { useState } from 'react';
import { db } from '../../lib/firebase';
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
  }
};

const NON_CLINICAL_COMPETENCIES = [
  { id: 'aspirator', label: 'Aspirator / Suction (SE 816)' },
  { id: 'cpm', label: 'Continuous Passive Motion - CPM (SE 904)' },
  { id: 'pap_device', label: 'PAP Device (SE 811)' },
  { id: 'pap_mask', label: 'PAP Mask Fitting (SE 851)' },
  { id: 'high_pressure_cylinder', label: 'High Pressure Cylinder (SE 805)' },
  { id: 'hospital_bed', label: 'Hospital Bed & Trapeze (SE 807)' },
  { id: 'liquid_oxygen', label: 'Liquid Oxygen (SE 809)' },
  { id: 'lymphedema_pump', label: 'Lymphedema Pump (SE 856)' },
  { id: 'nebulizer_nc', label: 'Nebulizer (SE 812)' },
  { id: 'negative_pressure_wound', label: 'Negative Pressure Wound Care System (SE 903)' },
  { id: 'oxygen_analyzer', label: 'Oxygen Analyzer (SE 801)' },
  { id: 'oxygen_concentrator', label: 'Oxygen Concentrator (SE 803)' },
  { id: 'oxygen_concentrator_maintenance', label: 'Oxygen Concentrator Maintenance', note: 'Requires certificate only' },
  { id: 'oxygen_conserving_device_nc', label: 'Oxygen Conserving Device (SE 814)' },
  { id: 'patient_lift', label: 'Patient Lift (SE 818)' },
  { id: 'field_poc_repair', label: 'Field POC Repair & Maintenance Competency', note: 'Requires certificate only' },
  { id: 'power_wheelchair', label: 'Power Wheelchair (SE 862)' },
  { id: 'scooter', label: 'Scooter (SE 863)' },
  { id: 'warehouse_equipment_cleaning', label: 'Warehouse Equipment Cleaning (SE 855)' },
  { id: 'wheelchair_nc', label: 'Wheelchair (SE 824)' },
];

const CLINICAL_COMPETENCIES = [
  { id: 'afflovest', label: 'AffloVest' },
  { id: 'airvo2', label: 'Airvo 2' },
  { id: 'astral_ventilator', label: 'Astral Ventilator' },
  { id: 'attention_to_detail', label: 'Attention to Detail' },
  { id: 'breas_vivo', label: 'Breas VIVO 45LS/50 Ventilator' },
  { id: 'cough_assist', label: 'Cough Assist (BiWaze)' },
  { id: 'cpap_bipap', label: 'CPAP & BIPAP' },
  { id: 'infant_monitor', label: 'Infant Monitor' },
  { id: 'invasive_ventilator', label: 'Invasive Ventilator' },
  { id: 'ltv_ventilator', label: 'LTV Ventilator' },
  { id: 'luisa_ventilator', label: 'Luisa Ventilator' },
  { id: 'mpv', label: 'Mouthpiece Ventilation (MPV)' },
  { id: 'nebulizer_c', label: 'Nebulizer' },
  { id: 'oxygen_c', label: 'Oxygen' },
  { id: 'oxygen_conserving_device_c', label: 'Oxygen Conserving Device' },
  { id: 'pediatric_ventilator', label: 'Pediatric Ventilator Management' },
  { id: 'pulse_oximetry', label: 'Pulse Oximetry' },
  { id: 'respiratory_assist_device', label: 'Respiratory Assist Device' },
  { id: 'trilogy_evo', label: 'Trilogy EVO Ventilator' },
  { id: 'vocsn_ventilator', label: 'VOCSN Ventilator (based on location)' },
  { id: 'virtual_ventilator_visit', label: 'Virtual Ventilator Visit' },
  { id: 'vivo2_bipap_st', label: 'VIVO2 - BiPAP ST' },
  { id: 'other1', label: 'Other', editableLabel: true },
  { id: 'other2', label: 'Other', editableLabel: true },
];

const INSTRUCTIONS = [
  {
    title: 'Welcome to Rotech (Okay to Hire) Email (applicable to employees hired after 2017)',
    body: 'Must have a copy of "Okay to hire" email. Check LCM and AM email.\n\nIf email cannot be located:\n- Check ICIMS\n- Search by Requisition the employee was hired under\n- Email (may have to go to "More")\n- Shares (these are emails that have been sent to hiring managers)\n- Look for "Cleared for hire" or "Welcome" email - print email for employee file\n\nIf email cannot be located in ICIMS, answer "N".',
  },
  { title: 'Job Description', body: 'Print from ICIMS.' },
  {
    title: 'Printing New Hire Documents from ICIMS',
    body: '1. Click on the Employee\n2. Click on Forms\n3. Click on Download - two boxes pop up with arrows in between them.',
  },
  {
    title: 'General Orientation (HR 548)',
    body: 'Review all policies on HR 548 with employee. Date and initial policies/processes as they are reviewed. Once completed, employee and manager must sign and date.',
  },
  { title: 'Professional Licensure', body: 'Must have copy of current license for all clinicians.' },
  { title: "Driver's License", body: 'Required for ALL location employees at time of hire and every 3 years.' },
  { title: 'Policy Acknowledgment / Computer Password Confidentiality', body: 'Print from ICIMS.' },
  { title: 'Mandatory Annual In-Services (SE 800)', body: 'SE 800 is required annually for all employees.' },
  {
    title: 'Storage and Distribution Training (FDA 019)',
    body: 'ENTER DATE ONLY (Initial & every 3 years). Required for ALL location employees at time of hire and every 3 years.',
  },
  { title: 'Manufacturing Facility Orientation (FDA 021)', body: 'Only for those locations manufacturing liquid oxygen (curbside filling).' },
  {
    title: 'RM 1234 Hazard Communication Program Training',
    body: 'Record with RM 1238 PPE Hazard Assessment attached (job description specific).',
  },
  {
    title: 'Employee Performance Review',
    body: 'Print employee reviews. Be sure employee has signed off on review (green check mark on bottom of last page).',
  },
  {
    title: 'Hepatitis B Test or OP 515 Hepatitis B Vaccination Statement',
    body: 'Print from ICIMS - If employee accepts, must have proof of vaccination. If employee no longer wants vaccine, a new form (OP 515) must be signed, refusing the vaccine series.\n\nMEDICAL INFORMATION MUST BE KEPT IN SEPARATE FILE.',
  },
  {
    title: 'TB Test / Risk Assessment',
    body: 'KY employees: TB test and risk assessment at hire & annually. Complete KY 641 annually.\nIL, MD, NC and PA employees: TB test at hire only.\nWA employees: TB test and risk assessment at hire & annually. Complete WA 641 annually.',
  },
  {
    title: 'Annual N95 Mask Fit Testing',
    body: 'Required for all "at risk" employees (PST, CST and RT) at hire and annually. Date only; leave blank if N/A.',
  },
  {
    title: 'Confirmation of Medical Clearance for Respirator Use (3M)',
    body: 'Medical Clearance documentation is required prior to fit testing (for initial fit testing after 2/1/2022).',
  },
  {
    title: 'Non-Clinical Competency Assessments',
    body: 'Employees MUST complete online competencies, pertaining to their job responsibilities, on Docebo: My Training Not Completed - or use search tool. Completed Competency Assessment (SE form) and certificate are to be placed in employee file.\n\nNON-CLINICAL COMPETENCIES ARE NOT REQUIRED FOR CLINICIANS.',
  },
  {
    title: 'Clinical Competency Assessment (CCA) Online Trainings',
    body: 'Clinicians MUST complete online competencies, pertaining to their job responsibilities, on Docebo: My Training Not Completed - or use search tool. Completed certificates are to be placed in employee file.',
  },
  {
    title: 'File Requirements',
    body: 'ALL employees MUST have a Personnel file and a SEPARATE Medical File.\nEmployees transfilling or curbside filling liquid oxygen MUST have a SEPARATE FDA File.',
  },
];

const STATUS_STYLES = {
  red: 'bg-red-100 border-red-400 text-red-900',
  yellow: 'bg-yellow-100 border-yellow-400 text-yellow-900',
  green: 'bg-green-100 border-green-400 text-green-900',
};

// Each competency is valid for 3 years from the entered date.
function getExpirationStatus(dateStr) {
  if (!dateStr) return null;
  const entered = new Date(`${dateStr}T00:00:00`);
  if (isNaN(entered.getTime())) return null;

  const expiration = new Date(entered);
  expiration.setFullYear(expiration.getFullYear() + 3);

  const warningStart = new Date(expiration);
  warningStart.setMonth(warningStart.getMonth() - 6);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today > expiration) return 'red';
  if (today >= warningStart) return 'yellow';
  return 'green';
}

function createEmptyEmployee() {
  return {
    key: crypto.randomUUID(),
    name: '',
    jobTitle: '',
    hireDate: '',
    personnelRecord: {},
    nonClinicalCompetencies: {},
    clinicalCompetencies: {},
  };
}

function CompetencySection({ title, comment, items, values, onChange }) {
  return (
    <div className="border-l-4 border-green-700 bg-green-50 rounded-lg p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h4 className="text-md font-semibold text-green-900">{title}</h4>
        <span className="text-xs text-gray-600">🔴 Expired (3+ yrs) &nbsp; 🟡 Expires within 6 mo &nbsp; 🟢 Current</span>
      </div>
      <p className="text-xs text-gray-700 mb-1 whitespace-pre-line">{comment}</p>
      <p className="text-xs font-semibold text-gray-600 mb-3">Leave date blank if N/A</p>
      <div className="space-y-2">
        {items.map((item) => {
          const status = getExpirationStatus(values[item.id]);
          return (
            <div key={item.id} className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-2">
              <div className="flex-1">
                {item.editableLabel ? (
                  <input
                    type="text"
                    value={values[`${item.id}_label`] || ''}
                    onChange={(e) => onChange(`${item.id}_label`, e.target.value)}
                    placeholder="Enter other certificate here"
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                ) : (
                  <span className="text-sm text-gray-700">{item.label}</span>
                )}
                {item.note && <span className="block text-xs italic text-gray-500">{item.note}</span>}
              </div>
              <input
                type="date"
                value={values[item.id] || ''}
                onChange={(e) => onChange(item.id, e.target.value)}
                className={`px-2 py-1 border rounded-lg text-sm ${status ? STATUS_STYLES[status] : 'border-gray-300'}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function JC427Form({ locationId, quarter, onSubmitSuccess }) {
  const [employees, setEmployees] = useState([createEmptyEmployee()]);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  const allPersonnelItemIds = Object.values(JC427_SECTIONS).flatMap(section => section.items.map(item => item.id));

  const updateEmployeeField = (key, field, value) => {
    setEmployees(prev => prev.map(emp => (emp.key === key ? { ...emp, [field]: value } : emp)));
  };

  const updatePersonnelRecord = (key, itemId, value) => {
    setEmployees(prev => prev.map(emp => (
      emp.key === key
        ? { ...emp, personnelRecord: { ...emp.personnelRecord, [itemId]: value } }
        : emp
    )));
  };

  const updateCompetency = (key, group, itemId, value) => {
    setEmployees(prev => prev.map(emp => (
      emp.key === key
        ? { ...emp, [group]: { ...emp[group], [itemId]: value } }
        : emp
    )));
  };

  const addEmployee = () => setEmployees(prev => [...prev, createEmptyEmployee()]);
  const removeEmployee = (key) => setEmployees(prev => prev.filter(emp => emp.key !== key));

  const isEmployeeComplete = (emp) => {
    if (!emp.name.trim() || !emp.jobTitle.trim() || !emp.hireDate) return false;
    return allPersonnelItemIds.every(id => emp.personnelRecord[id]);
  };

  const answeredCount = employees.reduce(
    (sum, emp) => sum + allPersonnelItemIds.filter(id => emp.personnelRecord[id]).length,
    0
  );
  const totalPersonnelFields = employees.length * allPersonnelItemIds.length;
  const completionPercentage = totalPersonnelFields > 0 ? Math.round((answeredCount / totalPersonnelFields) * 100) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitStatus('');

    try {
      if (employees.length === 0) {
        setSubmitStatus('Add at least one employee before submitting.');
        setLoading(false);
        return;
      }

      if (!employees.every(isEmployeeComplete)) {
        setSubmitStatus('Please complete Name, Job Title, Hire Date, and all Personnel Record items for every employee.');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'assessments'), {
        locationId: locationId,
        assessmentType: 'JC427',
        quarter: quarter,
        status: 'submitted',
        submittedAt: serverTimestamp(),
        employees: employees.map(({ key, ...emp }) => emp),
        comments: comments,
      });

      setSubmitStatus('✓ Assessment submitted successfully!');
      setEmployees([createEmptyEmployee()]);
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

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">JC 427 - Personnel Records Review</h2>
            <p className="text-gray-600 mb-4">{quarter} Assessment | Location: {locationId}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowInstructions(true)}
            className="text-sm text-green-700 font-medium hover:underline whitespace-nowrap"
          >
            📖 View Instructions
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-red-800">⚠ ALL employees MUST have a Personnel File and a SEPARATE Medical File.</p>
          <p className="text-sm font-semibold text-red-800">Employees transfilling or curbside filling liquid oxygen MUST have a SEPARATE FDA File.</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-700 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">{completionPercentage}% Complete ({answeredCount} of {totalPersonnelFields} personnel record items)</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {employees.map((emp, index) => (
          <div key={emp.key} className="border-2 border-green-700 rounded-lg p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-green-900">
                Employee {index + 1}{emp.name ? `: ${emp.name}` : ''}
              </h3>
              {employees.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEmployee(emp.key)}
                  className="text-red-600 text-sm font-medium hover:underline"
                >
                  Remove Employee
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={emp.name}
                  onChange={(e) => updateEmployeeField(emp.key, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={emp.jobTitle}
                  onChange={(e) => updateEmployeeField(emp.key, 'jobTitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                <input
                  type="date"
                  value={emp.hireDate}
                  onChange={(e) => updateEmployeeField(emp.key, 'hireDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {Object.entries(JC427_SECTIONS).map(([sectionKey, section]) => (
              <div key={sectionKey} className="border-l-4 border-green-700 bg-green-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-green-900 mb-3">{section.title}</h4>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-4">
                      <label className="flex-1 text-sm font-medium text-gray-700">{item.label}</label>
                      <select
                        value={emp.personnelRecord[item.id] || ''}
                        onChange={(e) => updatePersonnelRecord(emp.key, item.id, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">-- Select --</option>
                        <option value="complete">✓ Complete</option>
                        <option value="incomplete">✗ Incomplete</option>
                        <option value="na">N/A</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <CompetencySection
              title="Non-Clinical Competency Assessments"
              comment="Employees MUST complete online competencies, pertaining to their job responsibilities, on Docebo: My Training Not Completed - or use search tool. Completed Competency Assessment (SE form) and certificate are to be placed in employee file."
              items={NON_CLINICAL_COMPETENCIES}
              values={emp.nonClinicalCompetencies}
              onChange={(itemId, value) => updateCompetency(emp.key, 'nonClinicalCompetencies', itemId, value)}
            />

            <CompetencySection
              title="Clinical Competency Assessments"
              comment="Clinicians MUST complete online competencies, pertaining to their job responsibilities, on Docebo: My Training Not Completed - or use search tool. Completed certificates are to be placed in employee file."
              items={CLINICAL_COMPETENCIES}
              values={emp.clinicalCompetencies}
              onChange={(itemId, value) => updateCompetency(emp.key, 'clinicalCompetencies', itemId, value)}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addEmployee}
          className="w-full border-2 border-dashed border-green-700 text-green-700 py-3 rounded-lg font-medium hover:bg-green-50 transition"
        >
          + Add Employee
        </button>

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
          disabled={loading || employees.length === 0 || !employees.every(isEmployeeComplete)}
          className="w-full bg-green-700 text-white py-3 rounded-lg font-medium hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Assessment'}
        </button>
      </form>

      {/* Instructions Modal */}
      {showInstructions && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowInstructions(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">JC 427 Instructions</h3>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-700 mt-4">
              {INSTRUCTIONS.map((section, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-gray-900">{section.title}</h4>
                  <p className="whitespace-pre-line">{section.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
