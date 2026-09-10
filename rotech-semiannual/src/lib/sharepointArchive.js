// SharePoint archival relay (Power Automate flow — see docs/SHAREPOINT_ARCHIVAL_SETUP.md).
//
// When a location manager submits an assessment, this posts the generated PDF
// (the same Location_Form Name_Date Submitted.pdf a user downloads) to a
// Power Automate "When an HTTP request is received" flow, which drops it into
// the SharePoint binder structure: /<Region>/<Area>/<Location>/PDFs/.
//
// Fire-and-forget by design: archiveSubmissionToSharePoint() no-ops when
// SHAREPOINT_FLOW_URL is empty, and a failed post never blocks or breaks the
// submission itself (the assessment is already saved in Firestore; the flow's
// run history in Power Automate is the place to spot and retry failures).
//
// Like NOTIFY_WORKER_URL in ./notifyConfig.js, the flow URL ships in the
// public bundle. Its SAS signature only deters casual hits — the flow itself
// validates the payload (see the setup doc) and the worst an abuser can do is
// drop a bogus PDF into SharePoint, where the audit trail names the flow.
import { submissionPdfBase64 } from '../utils/submissionPdf';
import { FORM_NAMES } from '../utils/submissionView';

// Paste the flow's "HTTP POST URL" here (from the trigger step) to enable.
export const SHAREPOINT_FLOW_URL = '';

// SharePoint folder names can't contain these; keep in sync with the doc.
function cleanSegment(part) {
  return String(part || '')
    .replace(/[\\/:*?"<>|#%~&{}]/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || 'Unknown';
}

// "R8" -> "Region 8" to match the binder folder naming; anything else is
// used as-is (cleaned).
function regionFolder(regionId) {
  const m = /^R(\d+)$/i.exec(String(regionId || '').trim());
  return m ? `Region ${m[1]}` : cleanSegment(regionId || 'Unassigned');
}

export function buildArchivePayload(assessment, location, fileName, pdfBase64) {
  const submittedAt = assessment.submittedAt;
  const submittedIso =
    typeof submittedAt?.toDate === 'function' ? submittedAt.toDate().toISOString()
    : submittedAt instanceof Date ? submittedAt.toISOString()
    : new Date().toISOString();

  return {
    source: 'rotech-location-readiness',
    formType: assessment.assessmentType,
    formName: FORM_NAMES[assessment.assessmentType] || assessment.assessmentType,
    quarter: assessment.quarter,
    locationId: assessment.locationId,
    locationName: location?.name || assessment.locationId,
    city: location?.city || '',
    state: location?.state || '',
    regionId: location?.regionId || '',
    areaId: location?.areaId || '',
    submittedAt: submittedIso,
    fileName,
    folderPath: [
      regionFolder(location?.regionId),
      cleanSegment(location?.areaId || 'Unassigned'),
      cleanSegment(location?.name || assessment.locationId),
      'PDFs',
    ].join('/'),
    pdfBase64,
  };
}

// location: the readiness `locations` doc for this assessment (name, city,
// state, regionId, areaId). Never throws.
export async function archiveSubmissionToSharePoint(assessment, location) {
  if (!SHAREPOINT_FLOW_URL) return;
  try {
    const { fileName, base64 } = await submissionPdfBase64(assessment, location?.name);
    const payload = buildArchivePayload(assessment, location, fileName, base64);
    // text/plain + no-cors keeps this a "simple request": Power Automate's
    // HTTP trigger answers no CORS preflight, so a fetch with a JSON
    // content-type would be blocked by the browser before it ever sent.
    await fetch(SHAREPOINT_FLOW_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('SharePoint archival skipped:', err.message);
  }
}
