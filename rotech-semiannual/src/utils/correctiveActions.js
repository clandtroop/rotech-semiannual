// Corrective Action rules: a section is flagged when it has at least this many
// negative responses ("no" on OP541/OP512, "incomplete" on JC427). Flagging is
// informational only — it does not block submission, it surfaces sections that
// need corrective action documentation logged for follow-up.
export const CORRECTIVE_ACTION_THRESHOLD = 2;

const NEGATIVE_VALUE_BY_TYPE = {
  OP541: 'no',
  OP512: 'no',
  JC427: 'incomplete',
};

function isResponseMap(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function countNegative(responses, negativeValue) {
  return Object.values(responses || {}).filter(v => v === negativeValue).length;
}

function collectSections(assessment) {
  if (assessment.assessmentType === 'OP541') {
    const sections = Object.entries(assessment.facilityReview || {}).map(([key, responses]) => ({
      key: `facility_${key}`,
      label: `Facility Review — ${key}`,
      responses,
    }));

    if (assessment.warehouseReview?.included) {
      Object.entries(assessment.warehouseReview).forEach(([key, responses]) => {
        if (key === 'included' || !isResponseMap(responses)) return;
        sections.push({ key: `warehouse_${key}`, label: `Offsite Warehouse — ${key}`, responses });
      });
    }

    (assessment.vehicles || []).forEach((vehicle, i) => {
      Object.entries(vehicle).forEach(([key, responses]) => {
        if (!isResponseMap(responses)) return;
        sections.push({
          key: `vehicle${i}_${key}`,
          label: `Vehicle ${i + 1}${vehicle.unitNumber ? ` (Unit ${vehicle.unitNumber})` : ''} — ${key}`,
          responses,
        });
      });
    });

    return sections;
  }

  if (assessment.assessmentType === 'OP512') {
    return [{ key: 'responses', label: 'Facility Safety Inspection', responses: assessment.responses }];
  }

  if (assessment.assessmentType === 'JC427') {
    return (assessment.employees || []).map((emp, i) => ({
      key: `employee${i}_personnelRecord`,
      label: `${emp.name || `Employee ${i + 1}`} — Personnel Record`,
      responses: emp.personnelRecord,
    }));
  }

  return [];
}

// Returns the sections of an assessment that have crossed the corrective-action
// threshold, each annotated with its negative-response count.
export function getFlaggedSections(assessment) {
  const negativeValue = NEGATIVE_VALUE_BY_TYPE[assessment.assessmentType];
  if (!negativeValue) return [];

  return collectSections(assessment)
    .map(section => ({ ...section, negativeCount: countNegative(section.responses, negativeValue) }))
    .filter(section => section.negativeCount >= CORRECTIVE_ACTION_THRESHOLD);
}
