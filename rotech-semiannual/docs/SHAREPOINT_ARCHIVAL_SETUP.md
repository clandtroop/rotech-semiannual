# SharePoint PDF Archival — Power Automate Setup

When a location manager submits an assessment (OP 541, OP 512, or JC 427), the
app generates the same PDF a user gets from **Download PDF** and posts it to a
Power Automate flow, which files it in the SharePoint binder structure:

```
Documents/Location Readiness/
└─ Region 8/
   └─ A2/
      └─ Tulsa - Main/
         └─ PDFs/
            ├─ Tulsa - Main_OP 541_2026-08-20.pdf
            ├─ Tulsa - Main_OP 512_2026-08-20.pdf
            └─ Tulsa - Main_JC 427_2026-08-21.pdf
```

**Design note — why the flow does NOT query Firestore.** The original
integration outline had Power Automate reading Firestore and converting
HTML→PDF itself. Both halves are the hard way around: Firestore reads require
Google service-account authentication (no native PA connector; you'd need an
Azure Function or premium custom connector just to sign the tokens), and
HTML→PDF in PA needs premium/third-party actions. Instead, the app sends the
**finished PDF in the request body** (base64). The flow just decodes and saves
— 4 steps, standard connectors only, and the archived file is byte-identical
to what users see in the app.

The app-side code is already in place and disabled:
- `src/lib/sharepointArchive.js` — builds the payload, posts it; no-op until
  `SHAREPOINT_FLOW_URL` is filled in (same pattern as the comment-notify worker).
- Wired into the Location Manager dashboard after every successful submit.
- A failed or missing flow never blocks a submission; failures are visible in
  the flow's run history.

---

## 1. The payload contract

The flow receives an HTTP POST. The body is JSON **sent with
`Content-Type: text/plain`** (that keeps the browser from requiring a CORS
preflight, which Power Automate's trigger doesn't answer — parse it with
`json(triggerBody())`, see step 3.2):

```json
{
  "source": "rotech-location-readiness",
  "formType": "JC427",
  "formName": "JC 427",
  "quarter": "Q1-Q2 2026",
  "locationId": "661410",
  "locationName": "Tulsa - Main",
  "city": "Tulsa",
  "state": "OK",
  "regionId": "R8",
  "areaId": "A2",
  "submittedAt": "2026-08-21T14:32:00.000Z",
  "fileName": "Tulsa - Main_JC 427_2026-08-21.pdf",
  "folderPath": "Region 8/A2/Tulsa - Main/PDFs",
  "pdfBase64": "JVBERi0xLjMKJbrfrOAKMyAwIG9iago8PC..."
}
```

Notes:
- `folderPath` is pre-computed by the app: `R8` becomes `Region 8`, segments
  are cleaned of characters SharePoint rejects (`\ / : * ? " < > | # % ~ & { }`),
  and it always ends in `PDFs`. The raw `regionId`/`areaId` fields are also
  included in case you'd rather derive your own path in the flow.
- `fileName` is the app's standard `Location_Form Name_Date Submitted.pdf`.
- A resubmission after a rejection posts again with the same file name if it
  happens the same day — the flow overwrites, which is what you want (latest
  version wins; SharePoint version history keeps the old one).

## 2. SharePoint preparation (one-time)

1. Pick (or create) the SharePoint site and document library — e.g. the
   existing binder site, library `Documents`, root folder `Location Readiness`.
2. No need to pre-create region/area/location folders: the flow creates the
   full path on first use (step 3.4). Pre-create them only if you want to set
   per-area permissions before any PDFs arrive.
3. Permissions (recommended):
   - Area Managers: **Read** on their area's folder.
   - Location managers: no direct access needed (they have the app).
   - The flow's connection account (you) needs **Edit** on the library.

## 3. Build the flow (~15 minutes)

Power Automate → **Create** → **Instant cloud flow** → skip the trigger picker
→ add these steps:

### 3.1 Trigger — "When an HTTP request is received"
- Who can trigger: **Anyone** (the URL's built-in SAS signature is the gate).
- Leave the request body schema empty (we parse explicitly next — the body
  arrives as text, not JSON).
- The **HTTP POST URL** appears after the first save — you'll paste it into
  the app in section 4.

### 3.2 Parse JSON
- Content: `json(triggerBody())`  ← expression, not dynamic content. The app
  posts as `text/plain`, so `triggerBody()` is a string; `json()` parses it.
- Schema → **Use sample payload to generate schema** → paste the sample from
  section 1.

### 3.3 Condition — reject junk
- Condition: `source` **is equal to** `rotech-location-readiness`
  **AND** `pdfBase64` **is not equal to** (empty)
  **AND** `fileName` **ends with** `.pdf`
- In the **If no** branch: add **Terminate** → Status: **Cancelled**. (Or add
  a Response 400 first if you want callers to see a status; the app ignores
  responses either way.)

Everything below goes in the **If yes** branch.

### 3.4 SharePoint — "Create new folder"
- Site Address: your site.
- List or Library: your library (e.g. `Documents`).
- Folder Path: `Location Readiness/@{body('Parse_JSON')?['folderPath']}`
- This action creates the whole nested path and succeeds when it already
  exists. (If your tenant's connector version errors on an existing folder:
  open the next step's **Configure run after** and also check "has failed" —
  the Create file below still runs.)

### 3.5 SharePoint — "Create file"
- Site Address / Library: same as above.
- Folder Path: `Location Readiness/@{body('Parse_JSON')?['folderPath']}`
- File Name: `@{body('Parse_JSON')?['fileName']}`
- File Content: `base64ToBinary(body('Parse_JSON')?['pdfBase64'])`  ← expression.
- To make resubmissions overwrite instead of failing: in the flow list, open
  this flow's **Settings** for the Create file action — or simpler, leave it
  and accept that a same-day resubmit shows one failed run; the newest file
  is still the one that matters. Overwrite behavior: use the "Create file"
  action's `Advanced parameters → Overwrite` toggle where available in your
  connector version.

Save the flow. That's the whole thing — no Response action is needed (the
trigger auto-responds 202 Accepted, and the app fires-and-forgets anyway).

## 4. Turn it on in the app

1. Copy the trigger's **HTTP POST URL**.
2. In `rotech-semiannual/src/lib/sharepointArchive.js`, set:
   ```js
   export const SHAREPOINT_FLOW_URL = 'https://prod-XX.westus.logic.azure.com:443/workflows/.../invoke?...';
   ```
3. Deploy the app (`npm run deploy` from the `rotech-semiannual` folder, or
   merge and let the auto-deploy host publish).

Like the comment-notify worker URL, this URL ships in the public app bundle.
Its SAS signature deters casual abuse, and the flow's condition (step 3.3)
drops malformed posts; the worst-case abuse is a stray PDF appearing in
SharePoint, fully audited in the flow run history and SharePoint logs. If you
ever want it out of the bundle entirely, relay the post through the existing
Cloudflare Worker (`worker/notify-comment.js` shows the pattern) and keep the
flow URL in a Worker secret.

## 5. Test it end-to-end

Before touching the app, test the flow alone from any terminal
(this is a valid one-page PDF reading "Test"):

```bash
curl -X POST 'PASTE_FLOW_URL_HERE' \
  -H 'Content-Type: text/plain' \
  --data '{"source":"rotech-location-readiness","formType":"OP512","formName":"OP 512","quarter":"Q1-Q2 2026","locationId":"000000","locationName":"Flow Test","city":"","state":"","regionId":"R0","areaId":"A0","submittedAt":"2026-01-01T00:00:00.000Z","fileName":"Flow Test_OP 512_2026-01-01.pdf","folderPath":"Region 0/A0/Flow Test/PDFs","pdfBase64":"JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNjEyIDc5Ml0vQ29udGVudHMgNCAwIFIvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDUgMCBSPj4+Pj4+ZW5kb2JqCjQgMCBvYmo8PC9MZW5ndGggNDQ+PnN0cmVhbQpCVCAvRjEgMjQgVGYgMTAwIDcwMCBUZCAoVGVzdCkgVGogRVQKZW5kc3RyZWFtIGVuZG9iago1IDAgb2JqPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj5lbmRvYmoKdHJhaWxlcjw8L1Jvb3QgMSAwIFI+Pg=="}'
```

Expected: a run appears in the flow's **28-day run history** as Succeeded, and
`Location Readiness/Region 0/A0/Flow Test/PDFs/Flow Test_OP 512_2026-01-01.pdf`
opens in SharePoint showing "Test". Delete the `Region 0` folder afterwards.

Then the real thing: deploy the app with the URL set, submit an assessment at
a test location, and confirm the PDF lands under that location's real path.

## 6. Monitoring & troubleshooting

Weekly: glance at the flow's run history (Power Automate → My flows → this
flow). Every submission should have a run.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| No run at all after a submission | `SHAREPOINT_FLOW_URL` empty, app not redeployed, or flow turned Off | Check the URL in `sharepointArchive.js`, redeploy, flip the flow On |
| Run fails at Parse JSON | Body wasn't the expected JSON string | Confirm the Content expression is `json(triggerBody())` and the app is unmodified |
| Run cancelled at the condition | Payload failed validation (or an abuse attempt) | Inspect the run's trigger body |
| Run fails at Create file: path not found | Folder step skipped or renamed library | Re-check step 3.4's path matches 3.5's exactly |
| Run fails at Create file: file exists | Same-day resubmission and Overwrite off | Enable Overwrite (step 3.5) or ignore — latest successful run wins |
| PDF opens blank/corrupt | File Content not using `base64ToBinary(...)` | Fix the expression in step 3.5 |

## 7. Cost

~200 runs/quarter (3 forms × locations × occasional resubmits) is far inside
the Power Automate seeded/free allowance for an instant flow, and PDFs run
20–60 KB each — a few MB per quarter of SharePoint storage. Effectively $0.
