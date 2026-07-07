# ✅ DEPLOYMENT CHECKLIST - ROTECH SEMIANNUAL PLATFORM

## PHASE 1 BUILD COMPLETE ✅

Everything is built and ready. Follow this checklist to get live.

---

## PRE-DEPLOYMENT (Do Once)

### Firebase Setup

- [ ] Go to https://console.firebase.google.com
- [ ] Select project: **rotech-location-readiness**
- [ ] Go to **Authentication** → Enable **Email/Password**
- [ ] Go to **Firestore** → **Rules** tab
- [ ] Copy FIRESTORE_RULES.txt content
- [ ] Paste into Rules editor and click **Publish**
- [ ] Create Firestore collections (optional):
  - [ ] users
  - [ ] locations
  - [ ] assessments
  - [ ] area_managers
  - [ ] regions

### GitHub Setup

- [ ] Repo exists: https://github.com/clandtroop/rotech-semiannual
- [ ] Repo is public (for Pages to work)
- [ ] Clone repo: `git clone https://github.com/clandtroop/rotech-semiannual.git`

---

## INITIAL DEPLOYMENT

### Step 1: Install & Build (5 minutes)

```bash
cd rotech-semiannual
npm install
npm run build
```

**Expected output:**
```
✓ 120 modules transformed
dist/index.html                    0.50 kB
dist/assets/index-xxxxx.js         120.45 kB
```

### Step 2: Deploy (1 minute)

```bash
npm run deploy
```

**Expected output:**
```
Published to https://github.com/clandtroop/rotech-semiannual/settings/pages

✅ View your site at: https://clandtroop.github.io/rotech-semiannual/
```

### Step 3: Verify Deployment ✅

- [ ] Open https://clandtroop.github.io/rotech-semiannual/
- [ ] You should see the Rotech login page
- [ ] Try logging in (will fail without users, that's normal)

---

## DATA IMPORT

### Step 1: Import Region 8 Locations (3 minutes)

```javascript
// 1. Open browser console (F12)
// 2. Paste and run:

await importAllData();

// Expected output:
// 🚀 Starting full data import...
// ✅ Imported 1 regions
// ✅ Imported 34 locations
// ✅ Imported 5 area managers
// ✅ ALL DATA IMPORTED SUCCESSFULLY!
```

- [ ] Check Firestore console
- [ ] Verify 34 documents in `locations` collection
- [ ] Verify 5 documents in `area_managers` collection
- [ ] Verify 1 document in `regions` collection

---

## CREATE TEST USERS

### Step 1: Location Manager (Test User)

**In Firebase Console:**

1. Go to **Authentication** → **Users** tab
2. Click **Add user**
3. Email: `lm-test@rotech.com`
4. Password: `test123456`
5. Click **Add user**
6. Click on user → copy **UID**

**In Firestore Console:**

1. Go to **locations** collection
2. Create new document:
   - Document ID: (paste UID from Firebase)
   - Fields:
     ```
     email: "lm-test@rotech.com"
     role: "locationManager"
     locationId: "121510"
     areaId: "A2"
     regionId: "R8"
     createdAt: (server timestamp)
     ```
3. Click **Save**

- [ ] Test user created in Firebase Auth
- [ ] User document created in Firestore with correct locationId

### Step 2: Area Manager (Optional)

**In Firebase Console:**

1. Create user: `am-test@rotech.com` / `test123456`
2. Copy UID

**In Firestore Console:**

1. Go to **users** collection
2. Create document (ID = UID):
   ```
   email: "am-test@rotech.com"
   role: "areaManager"
   areaId: "A2"
   regionId: "R8"
   createdAt: (server timestamp)
   ```

- [ ] Area manager user created
- [ ] User document links to correct areaId

### Step 3: Region Admin (Optional)

**In Firebase Console:**

1. Create user: `ra-test@rotech.com` / `test123456`
2. Copy UID

**In Firestore Console:**

1. Go to **users** collection
2. Create document (ID = UID):
   ```
   email: "ra-test@rotech.com"
   role: "regionAdmin"
   regionId: "R8"
   createdAt: (server timestamp)
   ```

- [ ] Region admin user created
- [ ] User document links to correct regionId

---

## TEST THE APP

### Test as Location Manager

1. Go to https://clandtroop.github.io/rotech-semiannual/
2. Login:
   - Email: `lm-test@rotech.com`
   - Password: `test123456`
   - Role: Location Manager
3. Click **Sign In**
4. Verify you see:
   - [ ] Location: "Rotech" (Beaverton, OR)
   - [ ] Lawson #: 121510
   - [ ] 3 assessment cards (OP 541, OP 512, JC 427)
   - [ ] Button: "Access Survey Prep App"

### Test OP 541 Form

1. Click "Start Assessment" on OP 541 card
2. Select YES/NO/N/A for first few items
3. Watch progress bar update
4. Fill all 45 items
5. Add optional comment
6. Click "Submit Assessment"
7. Verify success message: "✓ Assessment submitted successfully!"
8. Go back - verify status changed to "✓ Submitted"

- [ ] Form loads correctly
- [ ] Validation works (can't submit without all items)
- [ ] Submission saves to Firestore
- [ ] Status updates after submission

### Test as Area Manager

1. Logout
2. Login as: `am-test@rotech.com` / `test123456`
3. Select role: Area Manager
4. Verify you see:
   - [ ] All locations in Area 2 listed
   - [ ] Submission status for each location
   - [ ] Metrics dashboard
   - [ ] Completion percentage

- [ ] Area Manager dashboard loads
- [ ] Shows only Area 2 locations
- [ ] Shows submission status correctly

### Test as Region Admin

1. Logout
2. Login as: `ra-test@rotech.com` / `test123456`
3. Select role: Region Admin
4. Verify you see:
   - [ ] Total locations: 34
   - [ ] Complete/Partial/Pending counts
   - [ ] Area manager summary table
   - [ ] Completion rate

- [ ] Region Admin dashboard loads
- [ ] Shows all Region 8 locations
- [ ] Shows area manager breakdown

---

## POST-DEPLOYMENT

### Monitoring

- [ ] Check Firebase console regularly for quota usage
- [ ] Monitor failed submissions in Firestore
- [ ] Review completed assessments weekly
- [ ] Track submission completion rates

### Next Actions

- [ ] Create Location Manager accounts for each real location
- [ ] Create Area Manager accounts for each area lead
- [ ] Create Region Admin accounts for directors
- [ ] Create Accreditation Specialist account (full access)
- [ ] Test with real location managers
- [ ] Gather feedback
- [ ] Plan Phase 2 features

---

## TROUBLESHOOTING

### App Won't Load

**Problem:** Blank screen or error
- [ ] Check browser console (F12) for errors
- [ ] Verify Firebase config in `src/lib/firebase.js`
- [ ] Check Firestore is enabled in Firebase project
- [ ] Clear browser cache (Ctrl+Shift+Delete)

### Can't Login

**Problem:** "Invalid user or wrong password"
- [ ] Verify user exists in Firebase Auth
- [ ] Check password is exactly correct (case sensitive)
- [ ] Verify user document exists in Firestore with correct role
- [ ] Check Firestore security rules are applied

### Can't See Location

**Problem:** "Location data could not be loaded"
- [ ] Verify locationId in user document matches a location ID
- [ ] Check `locations` collection has data (run importAllData())
- [ ] Verify Firestore security rules allow read access

### Forms Don't Submit

**Problem:** "Error: [error message]"
- [ ] Check Firestore security rules are published
- [ ] Verify user role is correct in Firestore
- [ ] Check browser console for error details
- [ ] Verify Firestore database quota not exceeded

### GitHub Pages Deploy Fails

**Problem:** Error running `npm run deploy`
- [ ] Run `npm install` first
- [ ] Install GitHub CLI: https://cli.github.com
- [ ] Login: `gh auth login`
- [ ] Try deploy again
- [ ] If still failing, manually run `npm run build` and push to GitHub

---

## MONITORING CHECKLIST

### Daily
- [ ] No critical errors in Firebase console
- [ ] Users can login and access their locations

### Weekly
- [ ] Check submission completion rates
- [ ] Review any failed submissions
- [ ] Verify Firestore usage (should be low)
- [ ] Update team on assessment status

### Monthly
- [ ] Generate completion reports by area
- [ ] Review deficiencies identified
- [ ] Plan corrective actions
- [ ] Update Phase 2 roadmap

---

## FIRESTORE USAGE TRACKING

### Free Tier Limits
- **Reads:** 50,000 per day
- **Writes:** 20,000 per day
- **Deletes:** 20,000 per day
- **Storage:** 1 GB total

### Estimate for Full Deployment
- 300+ locations × 3 assessments = ~900 documents
- Per day: ~200 submissions × 50 items = ~10K reads (safe)

### If Approaching Limits
1. Upgrade to Blaze plan (pay-as-you-go)
2. Implement caching on frontend
3. Archive old assessments to separate database

---

## LAUNCH COMMUNICATIONS

### Email to Location Managers

```
Subject: New Location Readiness Assessment Platform

Hi [Name],

Your location is now ready to submit semi-annual readiness 
assessments using our new platform.

Login here: https://clandtroop.github.io/rotech-semiannual/

Your credentials: [email/password provided separately]

Three forms to complete:
- OP 541: Facility Readiness (~20 minutes)
- OP 512: Safety Inspection (~15 minutes)
- JC 427: Personnel Records (~20 minutes)

Deadline: June 30, 2026 (Q1-Q2) or Dec 31, 2026 (Q3-Q4)

Questions? Contact [your contact info]
```

### Email to Area Managers

```
Subject: Monitor Your Location Readiness Status

Hi [Name],

You can now monitor submission status for all locations 
in your area using the new platform.

Login here: https://clandtroop.github.io/rotech-semiannual/

Your dashboard shows:
- All locations in your area
- Submission status (Pending, Partial, Complete)
- Completion rates and metrics

This will help you track progress and follow up with 
location managers as needed.

Questions? Contact [your contact info]
```

---

## FINAL CHECKLIST

### Before Going Live with Real Users

- [ ] All tests pass (Location Manager, Area Manager, Region Admin)
- [ ] Firebase Auth is enabled
- [ ] Firestore security rules are published
- [ ] Region 8 data is imported
- [ ] At least one test user can login and submit
- [ ] At least one test user can view dashboards
- [ ] Survey Prep App link works
- [ ] GitHub Pages deployment is live
- [ ] Backup plan documented (what if Firebase goes down?)

### Ready to Launch!

- [ ] Create Location Manager accounts
- [ ] Create Area Manager accounts
- [ ] Create Region Admin accounts
- [ ] Send login credentials securely
- [ ] Send communications above
- [ ] Monitor first week closely
- [ ] Gather feedback from users
- [ ] Plan Phase 2 sprint

---

## EMERGENCY CONTACTS

**Firebase Issues:**
- Firebase Status Page: https://status.firebase.google.com
- Firebase Documentation: https://firebase.google.com/docs

**GitHub Issues:**
- GitHub Status: https://www.githubstatus.com
- GitHub Docs: https://docs.github.com

**Technical Support:**
- Cody Landtroop: cody.landtroop@rotech.com

---

## VERSION DEPLOYED

**Platform:** Rotech Location Readiness Platform v1.0.0  
**Status:** ✅ Phase 1 Complete  
**Deployed:** July 7, 2026  
**Live URL:** https://clandtroop.github.io/rotech-semiannual/  
**Database:** rotech-location-readiness (Firebase)

---

**Ready to launch! Follow the checklist above and you'll be live in < 1 hour.** 🚀
