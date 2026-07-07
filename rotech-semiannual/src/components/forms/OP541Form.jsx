import { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const WARNING_BANNER_LINES = [
  'REPORT MUST BE ACCURATE.',
  'THIS IS YOUR OPPORTUNITY TO IDENTIFY ANY ISSUES AT YOUR LOCATION.',
  'REPORTS CANNOT BE DONE WITHOUT INSPECTING OR AUDITING THE AREAS IN QUESTION.',
  'REPORTS MUST BE AN ACCURATE REPRESENTATION OF YOUR FACILITY.',
];

const MADA_BULLETIN_PRODUCTS = [
  {
    name: 'MadaGel #7055',
    body: '8-digit lot number: first 2 digits = year, next 2 = month, next 2 = day, final 2 = batch number.\nExample: lot #14022004 was manufactured February 20, 2014, batch 4.\nExpires 5 years from manufacture date if sealed and unopened.',
  },
  {
    name: 'MadaCide-FD #7020, 7021, 7023, 7024',
    body: '5-digit lot number: first digit = batch produced that day, next 3 digits = Julian date of the year, last digit = year.\nExample: lot #23650 was batch #2, manufactured on the 365th day of 2010.\nExpires 2 years from manufacture date if sealed and unopened.',
  },
  {
    name: 'MadaCide-1 #7008, 7009',
    body: '5-digit lot number: first 3 digits = day of year (Julian), last 2 digits = year of manufacture.\nExample: lot #03023 was manufactured January 30, 2023.\nExpires 2 years from manufacture date if sealed and unopened.',
  },
  {
    name: 'MadaCide-FDW-Plus Wipes #7032',
    body: '8-digit lot number: first 2 digits = year, next 2 digits = month, last 4 digits = batch number.\nExample: lot #23030014 was manufactured March 2023, batch 0014.\nExpires 2 years from manufacture date if sealed and unopened.',
  },
  {
    name: 'Steri-Fab #7040, 7041, 7042',
    body: 'Two rows of numbers. Top row (5 digits) = batch number. Bottom row (6 digits) = date code: first 2 digits = month, next 2 = day, last 2 = year.\nExample: top row #12345 = batch number; bottom row #012611 = manufactured January 26, 2011.\nExpires 5 years from manufacture date if sealed and unopened.',
  },
  {
    name: 'Mada CPAP Mask Wipes #7035',
    body: '6-digit lot number: first 3 digits = batch number, next 2 digits = month, last digit = year.\nExample: lot #296012 = batch 296, manufactured January 2012.\nExpires 2 years from manufacture date if sealed and unopened.',
  },
];

const MADA_SHELF_LIFE = [
  { product: 'MadaCide-1', opened: '2 Years', sealed: '2 Years' },
  { product: 'MadaCide-FD', opened: '2 Years', sealed: '2 Years' },
  { product: 'Steri-Fab', opened: '2 Years', sealed: '5 Years' },
  { product: 'MadaCide-FDW-Plus', opened: '2 Years', sealed: '2 Years' },
  { product: 'MadaGel', opened: '2 Years', sealed: '5 Years' },
  { product: 'Mada CPAP Mask Wipes', opened: '2 Years', sealed: '2 Years' },
];

// ===== Facility Review (main per-location form) =====

const OVERALL_FACILITY_ITEMS = [
  { id: '1.1.14', label: 'Joint Commission contact sign posted in public view (JC 434)' },
  { id: '1.1.4', label: 'All licenses, certificates, and permits to operate posted in area accessible patients. Clinician license(s) must be posted in lobby.' },
  { id: '1.1.12', label: 'Hours of operation are posted' },
  { id: '2.3.1', label: 'Posted front door assistance sign for equipment returns (OP 554)' },
  { id: '2.2.1', label: 'No Pets Allowed sign posted on/near entrance to facility (OP 555)' },
  { id: 'covid_signage', label: 'COVID-19 signage posted as required by protocol', noPolicy: true },
  { id: 'restroom_accessibility', label: 'Are restrooms handicap accessible? If not, post "No Public Restrooms" signage in lobby', noPolicy: true },
  { id: '2.4.2', label: '"No Firearms" signs hanging on/near front entrance to facility. (Must have an English and Spanish version.) (Some states have French)' },
  { id: '1.1.23', label: 'Patient Safety Goals Poster visible in location (JC 428)' },
  { id: '1.1.4a', label: 'Field Management Organization Chart posted (OP 201)' },
  { id: '2.2.4', label: 'Safety Culture Poster hung in employee area (RM 1246)' },
  { id: '2.4.14', label: 'Workplace Violence Prevention Plan (OP 524) posted in each employee work area' },
  { id: '2.4.13', label: 'Evacuation plan posted (includes smoke alarms, fire extinguishers & designated assembly point)' },
  { id: '2.4.13a', label: 'Smoke alarms present and checks documented (per manufacturer recommendation, weekly) on FDA 001 OR Annual Inspection of suppression system' },
  { id: '2.2.28', label: 'Temperature sensitive supplies stored per manufacturer requirement (e.g., NPWT foam kits stored ≤ 77° F; not in warehouse or vehicles)' },
  { id: '2.4.13b', label: 'Fire extinguisher present and monthly checks documented (hang tag)' },
  { id: '2.4.13c', label: 'Record of annual fire extinguisher recharge' },
  { id: '2.2.1a', label: 'Exits identified and accessible (no obstructions and able to exit without a key). If emergency lighting present, monthly checks documented on FDA 001' },
  { id: '6.4.2', label: 'Compliant with all HIPAA regulations' },
  { id: 'courier_services', label: 'Are any services provided by courier services (Roadie, MSI, Spoke Logistics, Gohtr, Dropoff)? If yes, list courier and services provided in comments', noPolicy: true },
  { id: '2.2.1b', label: 'Facility is clean and organized' },
  { id: '2.3.1a', label: 'Hand gel readily available for employees and patients in all areas of the location' },
  { id: '2.4.2a', label: 'Expired Mada Products removed (2 years from Manufacturer Date) hand gel, wipes, spray', helpModal: 'mada' },
  { id: '2.3.1b', label: 'Hand washing guidelines posted in all restrooms (OP 503)' },
  { id: '2.3.1c', label: 'Antimicrobial soap in restroom (non-refillable)' },
  { id: '2.2.1c', label: 'PPE and first aid kits (without expired products) available in location' },
];

const WAREHOUSE_SPECIFIC_ITEMS = [
  { id: '2.2.5', label: 'Equipment managed in designated/segregated areas of warehouse (dirty, clean, service, quarantine, holding, patient ready, full & empty cylinders)' },
  { id: '2.2.10', label: 'Wheelchairs and POVs cleaned with Steri-Fab (Only required in CT, DE, IN, MA, OH, OK, PA, RI, TX, VA and WV)' },
  { id: '2.2.10a', label: 'OP 763 Disinfection Log completed documenting wheelchair cleaning (Only required in OH and PA)' },
  { id: '2.2.5a', label: 'Equipment is properly clear bagged & green tagged if patient ready' },
  { id: '2.2.5b', label: 'Dirty equipment is in non-clear bags & red tagged if not decontaminated in the field' },
  { id: '2.2.5c', label: 'Green tags are filled in correctly with maintenance date/initials' },
  { id: '2.2.5d', label: 'Red tags are filled in if equipment decontaminated or needs repair' },
  { id: '2.5.17', label: 'Oxygen cylinders are stored safely in location - NO FREE STANDING CYLINDERS' },
  { id: '2.5.17a', label: 'Warehouse Inventory Forms for cylinders (FDA 011) and LOX (FDA 023) are complete and accurate' },
  { id: '2.1.28', label: 'Rental equipment with battery back-up charging (Check all ventilators to verify preventative maintenance is not required)' },
  { id: '2.2.4a', label: 'Oxygen analyzer calibrated per mfg. guidelines. Self-calibrating analyzers (Maxtec Max 02) must be checked weekly, document on FDA 025' },
  { id: '2.2.5e', label: 'Apnea monitor simulator calibrated per mfg. guidelines' },
  { id: '2.4.2b', label: 'Expired products removed' },
  { id: '2.4.11', label: 'Secondary containers appropriately labeled (use RM 1239)' },
  { id: '2.2.10b', label: 'Approved disinfectant in cleaning area' },
  { id: '2.2.5f', label: '"Oxygen Only" tools are labeled and segregated' },
  { id: '2.2.1d', label: 'Eyewash present/updated - close proximity to cleaning area' },
  { id: '2.5.17b', label: '"No Smoking" signs posted (on entrances into oxygen storage area)' },
  { id: '2.5.17c', label: '"Authorized Personnel Only" signs posted (on entrances into oxygen storage area)' },
  { id: '2.4.15', label: 'Maintain OP 535 for all work areas at risk of reaching a temperature ≥ 87° F (≥ 80° F in MD and OR). Post form OP 536 in work areas at risk of reaching a temperature ≥ 87° F (≥ 80° F in MD and OR).' },
];

const DOCUMENTATION_ITEMS = [
  { id: '1.1.22', label: 'Patient perception of care survey reports reviewed quarterly' },
  { id: '1.1.22a', label: 'Referral source perception of care survey reports reviewed annually' },
  { id: '1.1.22b', label: 'Metrics report printed from Tableau and reviewed monthly' },
  { id: '1.1.22c', label: '20 EMR audits (OP 540) completed semi-annually (12 month track record)' },
  { id: '2.1.53', label: 'Following all state requirements as per CL 302 State Clinical Requirements' },
  { id: '2.4.8', label: 'OSHA 300A Work Injury Report posted per regulation' },
  { id: '2.2.1e', label: 'Record of Facility Safety Inspection (OP 512) twice in last 12 months (recommend January & July) & annual fire drill documented' },
  { id: '2.4.13d', label: 'Emergency Action/Fire Prevention Plan completed (RM 1240)' },
  { id: '2.2.2', label: 'Emergency Preparedness Plan (EPP) completed/printed annually (OP525 - all pages)' },
  { id: '2.2.2a', label: 'Emergency Plan activation documented on OP 857 Emergency Documentation & Recovery' },
  { id: '2.2.2b', label: 'Priority Codes and Quadrants in eIntake under attributes' },
  { id: '1.1.25', label: 'Morning meeting conducted per policy, documented on OP 843 Morning Meeting Checklist' },
  { id: '2.2.3', label: 'SDS book available (data sheets alphabetized) to include: RM 1232 Hazardous Chemical Inventory List, RM 1234 Hazard Communication Program Training for each employee, RM 1238 PPE Hazard Assessment for each employee' },
  { id: '7.2', label: 'Personnel and medical files stored separately in a locked cabinet' },
  { id: '1.1.21', label: 'In-services are documented routinely (e.g., MMM Hit List, policy review, "Don\'t Bug Me" and Safety Matters newsletters, monthly safety meeting, new equipment, etc.) on OP 520 In-Service Attendance Record' },
  { id: '2.3.1d', label: 'Targeted Surveillance Log updated daily (OP 519), separate log kept for employees on LCM computer' },
  { id: '6.3', label: 'Employee Signature Sheet current (OP 583)' },
  { id: '2.1.22', label: 'Community Resource List maintained (OP 556)' },
  { id: '2.1.27', label: 'Patient Paperless Contact Cards (RHI 1080) available and provided to patients at the time of any equipment setup' },
  { id: '1.1.23a', label: 'Identified patient fall risk flagged in eIntake under attributes' },
  { id: '1.1.23b', label: 'Identified patient smoking risk flagged in eIntake under attributes' },
  { id: '2.4.1', label: 'Incidents documented and reported per policy (OP 518)' },
  { id: '2.1.29', label: 'Patient complaints are documented (OP 564)' },
  { id: '2.1.29a', label: 'Patient complaints are responded to within 5 days' },
  { id: '2.1.29b', label: 'Patient complaints responded to in writing within 14 days (OP 566)' },
];

const FACILITY_REVIEW_SECTIONS = {
  overallFacility: { title: 'Overall Facility', items: OVERALL_FACILITY_ITEMS },
  warehouseSpecific: { title: 'Warehouse Specific', items: WAREHOUSE_SPECIFIC_ITEMS },
  documentation: { title: 'Documentation', items: DOCUMENTATION_ITEMS },
};

// ===== Offsite Warehouse Review =====

const WAREHOUSE_OVERALL_FACILITY_ITEMS = [
  { id: '1.1.14', label: 'Joint Commission contact sign posted in public view (JC 434)' },
  { id: '1.1.4', label: 'All licenses, certificates, and permits to operate posted in area accessible patients' },
  { id: '1.1.12', label: 'Hours of operation are posted' },
  { id: '2.3.1', label: 'Posted front door assistance sign for equipment returns (OP 554)' },
  { id: '2.2.1', label: 'No Pets Allowed sign posted on/near entrance to facility (OP 555)' },
  { id: 'covid_signage', label: 'COVID-19 signage posted as required by protocol', noPolicy: true },
  { id: 'restroom_accessibility', label: 'Are restrooms handicap accessible? If not, post "No Public Restrooms" signage in lobby', noPolicy: true },
  { id: '2.4.2', label: '"No Firearms" signs hanging on/near front entrance to facility. (Must have an English and Spanish version.) (Some states have French)' },
  { id: '1.1.23', label: 'Patient Safety Goals Poster visible in location (JC 428)' },
  { id: '1.1.4a', label: 'Field Management Organization Chart posted (OP 201)' },
  { id: '2.2.4', label: 'Safety Culture Poster hung in employee area (RM 1246)' },
  { id: '2.4.14', label: 'Workplace Violence Prevention Plan (OP 524) posted in each employee work area' },
  { id: '2.4.13', label: 'Evacuation plan posted (includes smoke alarms, fire extinguishers & designated assembly point)' },
  { id: '2.4.13a', label: 'Smoke alarms present and checks documented (per manufacturer recommendation, weekly) on FDA 001 OR Annual Inspection of suppression system' },
  { id: '2.4.13b', label: 'Fire extinguisher present and monthly checks documented (hang tag)' },
  { id: '2.4.13c', label: 'Record of annual fire extinguisher recharge' },
  { id: '2.2.1a', label: 'Exits identified and accessible (no obstructions and able to exit without a key). If emergency lighting present, monthly checks documented on FDA 001' },
  { id: '6.4.2', label: 'Compliant with all HIPAA regulations' },
  { id: '2.2.1b', label: 'Facility is clean and organized' },
  { id: '2.3.1a', label: 'Hand gel readily available for employees and patients in all areas of the location' },
  { id: '2.4.2a', label: 'Expired Mada Products removed (2 years from Manufacturer Date) hand gel, wipes, spray', helpModal: 'mada' },
  { id: '2.3.1b', label: 'Hand washing guidelines posted in all restrooms (OP 503)' },
  { id: '2.3.1c', label: 'Antimicrobial soap in restroom (non-refillable)' },
  { id: '2.2.1c', label: 'PPE and first aid kits (without expired products) available in location' },
];

const WAREHOUSE_DOCUMENTATION_ITEMS = [
  { id: '2.1.53', label: 'Following all state requirements as per CL 302 State Clinical Requirements' },
  { id: '2.2.1e', label: 'Record of Facility Safety Inspection (OP 512) twice in last 12 months (recommend January & July) & annual fire drill documented' },
  { id: '2.4.13d', label: 'Emergency Action/Fire Prevention Plan completed (RM 1240)' },
  { id: '2.2.3', label: 'SDS book available (data sheets alphabetized) to include: RM 1232 Hazardous Chemical Inventory List, RM 1234 Hazard Communication Program Training for each employee, RM 1238 PPE Hazard Assessment for each employee' },
  { id: '2.1.22', label: 'Community Resource List (OP 556)' },
  { id: '2.1.27', label: 'Patient Paperless Contact Cards (RHI 1080) available and provided to patients at the time of any equipment setup' },
];

const WAREHOUSE_REVIEW_SECTIONS = {
  overallFacility: { title: 'Overall Facility', items: WAREHOUSE_OVERALL_FACILITY_ITEMS },
  warehouseSpecific: { title: 'Warehouse Specific', items: WAREHOUSE_SPECIFIC_ITEMS },
  documentation: { title: 'Documentation', items: WAREHOUSE_DOCUMENTATION_ITEMS },
};

// ===== Vehicle Review (per vehicle) =====

const VEHICLE_DOCUMENTATION_ITEMS = [
  { id: '2.2.1', label: 'Record of post daily vehicle inspection (OP 533)' },
  { id: '2.2.1a', label: 'Current vehicle registration & insurance' },
  { id: '2.2.1b', label: 'Accident report kit (RM 1202)' },
  { id: '2.6.7', label: 'Shipping papers (OP 534) matching number of tanks/vessels in door or on drivers seat' },
  { id: '1.1.23', label: 'Printed copies or RHI 1001 Home Medical Equipment Booklet' },
  { id: '1.1.12', label: 'Printed copies of RHI 1000 Patient Information Booklet' },
  { id: '1.1.23a', label: 'Printed copies of PE 662 High-Risk Smoking Education Packet' },
  { id: '2.1.15', label: 'Printed copies of OP 504 Against Medical Advice (AMA)' },
];

const VEHICLE_EMERGENCY_EQUIPMENT_ITEMS = [
  { id: '2.2.1c', label: 'Reflective triangles' },
  { id: '2.2.1d', label: 'Working flashlight' },
  { id: '2.2.1e', label: 'Fire extinguisher, secured in cab, with monthly checks documented' },
  { id: '2.2.1f', label: 'Record of annual fire extinguisher recharge' },
  { id: '2.2.1g', label: 'PPE kit present, to include N95 mask and face-shield or goggles' },
  { id: '2.2.1h', label: 'First aid kit without expired products' },
  { id: '2.2.1i', label: 'Eye wash (16 oz. bottle) check for expiration and temperature parameters' },
  { id: '2.2.1j', label: 'SDS present on vehicle (only for chemicals on vehicle - Rotech Oxygen, eyewash, fire extinguisher, MadaGel, Mada FD, Mada Wipes and any other chemicals in vehicle)' },
  { id: '2.2.1k', label: '"No Smoking" sign in cab' },
  { id: '2.2.1l', label: '"No Smoking" sign in cargo' },
];

const VEHICLE_STORAGE_ITEMS = [
  { id: '2.2.1m', label: 'Vehicle is clean and organized' },
  { id: '2.2.1n', label: 'Ratchet straps - NO BUNGEE CORDS' },
  { id: '2.2.1o', label: 'Circuit tester, Flow pen, Analyzer' },
  { id: '2.2.1p', label: 'Disinfectant present (Madacide wipes)' },
  { id: '2.2.5g', label: 'Red tags and non-clear bags present in vehicle' },
  { id: '2.2.5h', label: 'All equipment is properly bagged and tagged' },
  { id: '2.2.1q', label: 'Equipment and hand truck secured during transport' },
  { id: '2.7.9', label: 'Vehicle is locked when unattended' },
  { id: '2.1.28', label: 'All tanks secured' },
  { id: '2.2.1r', label: 'Signage for full/empty oxygen cylinders posted (OP 546)' },
];

const VEHICLE_PLACARD_ITEMS = [
  { id: '2.6', label: 'Foley book complete for daily inspection' },
  { id: '2.6a', label: 'Current medical card' },
  { id: '2.6b', label: 'CDL license' },
  { id: '2.6c', label: 'Hazardous materials registration' },
  { id: '2.5.22', label: 'PPE kit for Transfill Drivers (goggles, face shield, apron, leather gloves or equivalent, steel toe shoes)' },
  { id: '2.6d', label: 'Record of annual certification of LOX scale' },
  { id: '2.6e', label: 'Record of annual DOT Inspection' },
];

const VEHICLE_SECTIONS = {
  documentation: { title: 'Documentation', items: VEHICLE_DOCUMENTATION_ITEMS },
  emergencyEquipment: { title: 'Emergency Equipment', items: VEHICLE_EMERGENCY_EQUIPMENT_ITEMS },
  storage: { title: 'Storage', items: VEHICLE_STORAGE_ITEMS },
  placardVehicles: { title: 'Placard Vehicles', items: VEHICLE_PLACARD_ITEMS },
};

function createEmptySectionResponses(sections) {
  return Object.keys(sections).reduce((acc, key) => ({ ...acc, [key]: {} }), {});
}

function createEmptyVehicle() {
  return {
    key: crypto.randomUUID(),
    driverName: '',
    unitNumber: '',
    ...createEmptySectionResponses(VEHICLE_SECTIONS),
  };
}

function countSectionItems(sections) {
  return Object.values(sections).reduce((sum, section) => sum + section.items.length, 0);
}

function countSectionAnswered(sections, responses) {
  return Object.entries(sections).reduce(
    (sum, [key, section]) => sum + section.items.filter(item => responses[key]?.[item.id]).length,
    0
  );
}

function isSectionsComplete(sections, responses) {
  return Object.entries(sections).every(([key, section]) => (
    section.items.every(item => responses[key]?.[item.id])
  ));
}

function isVehicleComplete(vehicle) {
  if (!vehicle.driverName.trim() || !vehicle.unitNumber.trim()) return false;
  return isSectionsComplete(VEHICLE_SECTIONS, vehicle);
}

const TABS = [
  { id: 'facility', label: 'Facility Review' },
  { id: 'warehouse', label: 'Offsite Warehouse' },
  { id: 'vehicles', label: 'Vehicle Review' },
];

function ChecklistSection({ title, items, values, onChange, onShowMada }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-blue-900 mb-3 pb-2 border-b-2 border-blue-900">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">
                  {!item.noPolicy && <span className="font-semibold text-blue-900">{item.id}: </span>}{item.label}
                </label>
                {item.helpModal === 'mada' && (
                  <button
                    type="button"
                    onClick={onShowMada}
                    className="block text-xs text-blue-700 font-medium hover:underline mt-1"
                  >
                    📄 How to read Mada EXP Dates
                  </button>
                )}
              </div>
              <select
                value={values[item.id] || ''}
                onChange={(e) => onChange(item.id, e.target.value)}
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
      </div>
    </div>
  );
}

export default function OP541Form({ locationId, quarter, onSubmitSuccess }) {
  const [activeTab, setActiveTab] = useState('facility');
  const [facilityResponses, setFacilityResponses] = useState(() => createEmptySectionResponses(FACILITY_REVIEW_SECTIONS));
  const [warehouseIncluded, setWarehouseIncluded] = useState(false);
  const [warehouseResponses, setWarehouseResponses] = useState(() => createEmptySectionResponses(WAREHOUSE_REVIEW_SECTIONS));
  const [vehicles, setVehicles] = useState([createEmptyVehicle()]);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMadaBulletin, setShowMadaBulletin] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  const updateFacilityResponse = (sectionKey, itemId, value) => {
    setFacilityResponses(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [itemId]: value },
    }));
  };

  const updateWarehouseResponse = (sectionKey, itemId, value) => {
    setWarehouseResponses(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [itemId]: value },
    }));
  };

  const updateVehicleField = (vehicleKey, field, value) => {
    setVehicles(prev => prev.map(v => (v.key === vehicleKey ? { ...v, [field]: value } : v)));
  };

  const updateVehicleResponse = (vehicleKey, sectionKey, itemId, value) => {
    setVehicles(prev => prev.map(v => (
      v.key === vehicleKey
        ? { ...v, [sectionKey]: { ...v[sectionKey], [itemId]: value } }
        : v
    )));
  };

  const addVehicle = () => setVehicles(prev => [...prev, createEmptyVehicle()]);
  const removeVehicle = (key) => setVehicles(prev => prev.filter(v => v.key !== key));

  const facilityTotal = countSectionItems(FACILITY_REVIEW_SECTIONS);
  const facilityAnswered = countSectionAnswered(FACILITY_REVIEW_SECTIONS, facilityResponses);
  const facilityComplete = facilityAnswered === facilityTotal;

  const warehouseTotal = countSectionItems(WAREHOUSE_REVIEW_SECTIONS);
  const warehouseAnswered = countSectionAnswered(WAREHOUSE_REVIEW_SECTIONS, warehouseResponses);
  const warehouseComplete = !warehouseIncluded || warehouseAnswered === warehouseTotal;

  const vehiclesComplete = vehicles.length > 0 && vehicles.every(isVehicleComplete);

  const canSubmit = facilityComplete && warehouseComplete && vehiclesComplete;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitStatus('');

    try {
      if (!facilityComplete) {
        setSubmitStatus('Please complete every item in the Facility Review tab before submitting.');
        setLoading(false);
        return;
      }
      if (warehouseIncluded && !warehouseComplete) {
        setSubmitStatus('Please complete every item in the Offsite Warehouse tab before submitting.');
        setLoading(false);
        return;
      }
      if (!vehiclesComplete) {
        setSubmitStatus('Please add at least one vehicle and complete Driver Name, Unit Number, and every checklist item for each vehicle.');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'assessments'), {
        locationId: locationId,
        assessmentType: 'OP541',
        quarter: quarter,
        status: 'submitted',
        submittedAt: serverTimestamp(),
        facilityReview: facilityResponses,
        warehouseReview: warehouseIncluded ? { included: true, ...warehouseResponses } : null,
        vehicles: vehicles.map(({ key, ...vehicle }) => vehicle),
        comments: comments,
      });

      setSubmitStatus('✓ Assessment submitted successfully!');
      setFacilityResponses(createEmptySectionResponses(FACILITY_REVIEW_SECTIONS));
      setWarehouseIncluded(false);
      setWarehouseResponses(createEmptySectionResponses(WAREHOUSE_REVIEW_SECTIONS));
      setVehicles([createEmptyVehicle()]);
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

  const overallAnswered = facilityAnswered + (warehouseIncluded ? warehouseAnswered : 0);
  const overallTotal = facilityTotal + (warehouseIncluded ? warehouseTotal : 0);
  const completionPercentage = overallTotal > 0 ? Math.round((overallAnswered / overallTotal) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">OP 541 - Facility Readiness</h2>
        <p className="text-gray-600 mb-4">{quarter} Assessment | Location: {locationId}</p>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 mb-4 text-center">
          {WARNING_BANNER_LINES.map((line) => (
            <p key={line} className="text-sm font-semibold text-yellow-800">{line}</p>
          ))}
        </div>

        {/* Forms Location Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4 text-center">
          <p className="text-sm font-semibold text-blue-800">
            All forms can be found on the Rotech Homepage under Forms —{' '}
            <a
              href="https://dome.rotech.com/trees/?app=forms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-900"
            >
              https://dome.rotech.com/trees/?app=forms
            </a>
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-900 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {completionPercentage}% Complete ({overallAnswered} of {overallTotal} facility/warehouse items)
          {' · '}{vehicles.filter(isVehicleComplete).length} of {vehicles.length} vehicle(s) complete
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 border-b border-gray-200">
          {TABS.map((tab) => {
            const isComplete = tab.id === 'facility'
              ? facilityComplete
              : tab.id === 'warehouse'
                ? (!warehouseIncluded || warehouseComplete)
                : vehiclesComplete;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label} {isComplete ? '✓' : ''}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {activeTab === 'facility' && (
          <div>
            {Object.entries(FACILITY_REVIEW_SECTIONS).map(([sectionKey, section]) => (
              <ChecklistSection
                key={sectionKey}
                title={section.title}
                items={section.items}
                values={facilityResponses[sectionKey]}
                onChange={(itemId, value) => updateFacilityResponse(sectionKey, itemId, value)}
                onShowMada={() => setShowMadaBulletin(true)}
              />
            ))}
          </div>
        )}

        {activeTab === 'warehouse' && (
          <div>
            <label className="flex items-center gap-2 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={warehouseIncluded}
                onChange={(e) => setWarehouseIncluded(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-800">This location has an offsite warehouse</span>
            </label>

            {warehouseIncluded ? (
              Object.entries(WAREHOUSE_REVIEW_SECTIONS).map(([sectionKey, section]) => (
                <ChecklistSection
                  key={sectionKey}
                  title={section.title}
                  items={section.items}
                  values={warehouseResponses[sectionKey]}
                  onChange={(itemId, value) => updateWarehouseResponse(sectionKey, itemId, value)}
                  onShowMada={() => setShowMadaBulletin(true)}
                />
              ))
            ) : (
              <p className="text-sm text-gray-600">
                Check the box above if this location has a separate offsite warehouse to complete this section.
              </p>
            )}
          </div>
        )}

        {activeTab === 'vehicles' && (
          <div className="space-y-6">
            {vehicles.map((vehicle, index) => (
              <div key={vehicle.key} className="border-2 border-blue-900 rounded-lg p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-blue-900">
                    Vehicle {index + 1}{vehicle.unitNumber ? `: Unit ${vehicle.unitNumber}` : ''}
                  </h3>
                  {vehicles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVehicle(vehicle.key)}
                      className="text-red-600 text-sm font-medium hover:underline"
                    >
                      Remove Vehicle
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Driver Name</label>
                    <input
                      type="text"
                      value={vehicle.driverName}
                      onChange={(e) => updateVehicleField(vehicle.key, 'driverName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number</label>
                    <input
                      type="text"
                      value={vehicle.unitNumber}
                      onChange={(e) => updateVehicleField(vehicle.key, 'unitNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {Object.entries(VEHICLE_SECTIONS).map(([sectionKey, section]) => (
                  <ChecklistSection
                    key={sectionKey}
                    title={section.title}
                    items={section.items}
                    values={vehicle[sectionKey]}
                    onChange={(itemId, value) => updateVehicleResponse(vehicle.key, sectionKey, itemId, value)}
                    onShowMada={() => setShowMadaBulletin(true)}
                  />
                ))}
              </div>
            ))}

            <button
              type="button"
              onClick={addVehicle}
              className="w-full border-2 border-dashed border-blue-900 text-blue-900 py-3 rounded-lg font-medium hover:bg-blue-50 transition"
            >
              + Add Vehicle
            </button>
          </div>
        )}

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
          disabled={loading || !canSubmit}
          className="w-full bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Assessment'}
        </button>
      </form>

      {/* Mada Product Bulletin Modal */}
      {showMadaBulletin && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowMadaBulletin(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">How to Read Mada EXP Dates</h3>
              <button
                type="button"
                onClick={() => setShowMadaBulletin(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4 mb-4">
              Source: Mada Medical Products Inc. Product Bulletin, May 26, 2023 (Lot Number Conversions / Infection Control / Cleaning Products).
              Expiration dates are not required on EPA registered products, but all of Mada's EPA registered products carry a lot number label.
            </p>

            <div className="space-y-4 text-sm text-gray-700">
              {MADA_BULLETIN_PRODUCTS.map((product) => (
                <div key={product.name}>
                  <h4 className="font-semibold text-gray-900">{product.name}</h4>
                  <p className="whitespace-pre-line">{product.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h4 className="font-semibold text-gray-900 mb-2">Shelf Life Summary</h4>
              <table className="w-full text-sm border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-gray-200">Product</th>
                    <th className="text-left px-3 py-2 border-b border-gray-200">Opened and Recapped</th>
                    <th className="text-left px-3 py-2 border-b border-gray-200">Sealed (Unopened)</th>
                  </tr>
                </thead>
                <tbody>
                  {MADA_SHELF_LIFE.map((row) => (
                    <tr key={row.product} className="border-b border-gray-100">
                      <td className="px-3 py-2">{row.product}</td>
                      <td className="px-3 py-2">{row.opened}</td>
                      <td className="px-3 py-2">{row.sealed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
