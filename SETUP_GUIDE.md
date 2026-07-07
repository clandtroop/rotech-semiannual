# 🚀 ROTECH SEMIANNUAL PLATFORM - SETUP & DEPLOYMENT GUIDE

## Phase 1 Implementation Complete ✅

**What's Built:**
- ✅ Firebase Authentication (4 user roles)
- ✅ Location Manager submission interface (OP 541, OP 512, JC 427)
- ✅ Area Manager dashboard (location status overview)
- ✅ Region Admin dashboard (company-wide metrics)
- ✅ Firestore integration with security rules
- ✅ GitHub Pages deployment configuration

---

## STEP 1: Clone Repository & Install Dependencies

### Local Development Setup

```bash
# Clone the repo
git clone https://github.com/clandtroop/rotech-semiannual.git
cd rotech-semiannual

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:5173 and you should see the login page.

---

## STEP 2: Firebase Configuration

### 2.1 Enable Firebase Authentication

1. Go to **console.firebase.google.com**
2. Select project: **rotech-location-readiness**
3. Go to **Authentication** (left sidebar)
4. Click **Get started**
5. Select **Email/Password**
6. Enable it and click **Save**

### 2.2 Apply Firestore Security Rules

1. In Firebase console, go to **Firestore Database**
2. Click **Rules** tab
3. Replace all code with content from `FIRESTORE_RULES.txt` in your repo
4. Click **Publish**

```
⚠️ IMPORTANT: Security rules are essential before going to production!
These rules ensure:
- Location Managers can only access their own location
- Area Managers can only view their assigned areas
- Region Admins see their region only
- Accreditation Specialists have full access
```

### 2.3 Create Collections Structure

Firestore will auto-create collections as data is added, but you can pre-create them:

1. In Firestore console, click **Create collection**
2. Create these empty collections:
   - `users`
   - `locations`
   - `assessments`
   - `area_managers`
   - `regions`

---

## STEP 3: Import Location & User Data

### 3.1 Prepare Data Import

The app includes a data import utility with Region 8 locations pre-configured.

1. Add this line temporarily to `src/App.jsx` (after imports):

```javascript
import { importAllData } from './utils/importData';
window.importAllData = importAllData;
```

2. Save and refresh the app

3. Open browser console (F12) and run:

```javascript
await importAllData()
```

You'll see output like:
```
🚀 Starting full data import...
✅ Imported 5 regions
✅ Imported 34 locations
✅ Imported 5 area managers
✅ ALL DATA IMPORTED SUCCESSFULLY!
```

4. Check Firestore console to verify:
   - **locations** collection has 34 documents (Region 8)
   - **area_managers** collection has 5 documents
   - **regions** collection has 1 document

5. **Remove the import line** from `src/App.jsx` when done

### 3.2 Create Test User Accounts

You need to manually create user accounts for Location Managers via Firebase console:

1. Go to **Firebase Console** → **Authentication** → **Users**
2. Click **Add user**
3. Create a test Location Manager:
   - Email: `manager@rotech.com`
   - Password: `testpass123`
   - Click **Add user**

4. The user will be created in Firebase Auth

5. Now you need to add them to Firestore users collection:
   - Go to **Firestore** → **users** collection
   - Click **Add document**
   - Document ID: (copy the user's UID from Firebase Auth)
   - Fields:
     ```
     email: "manager@rotech.com"
     role: "locationManager"
     locationId: "121510"  (Beaverton, OR location)
     areaId: "A2"
     regionId: "R8"
     createdAt: (current timestamp)
     ```

6. Click **Save**

### 3.3 Test Login

1. Go to http://localhost:5173
2. Try logging in with:
   - **Email:** manager@rotech.com
   - **Password:** testpass123
   - **Role:** Location Manager
3. You should see the Location Manager dashboard with Beaverton location

---

## STEP 4: Deploy to GitHub Pages

### 4.1 Build the App

```bash
npm run build
```

This creates a `dist/` folder with all production files.

### 4.2 Deploy to GitHub Pages

```bash
npm run deploy
```

⚠️ **Note:** This script uses `gh-pages` package. Make sure you have:
- GitHub token configured locally (if using private SSH key)
- Or use GitHub CLI: `gh auth login`

### 4.3 Access Live App

Your app is now live at:

```
https://clandtroop.github.io/rotech-semiannual/
```

---

## STEP 5: Create More User Accounts

Repeat Step 3.2 for each user you want to add:

### Location Managers

Create one per location with appropriate `locationId`:

```
Email: lm-121510@rotech.com (or real email)
Role: locationManager
locationId: 121510 (or any lawson #)
areaId: A2
regionId: R8
```

### Area Managers

Create one per area with appropriate `areaId`:

```
Email: cassidy.williams@rotech.com
Role: areaManager
locationId: (leave null or empty)
areaId: A2
regionId: R8
```

### Region Admins

Create one per region:

```
Email: josh.connell@rotech.com
Role: regionAdmin
locationId: (leave null)
areaId: (leave null)
regionId: R8
```

### Accreditation Specialists

Create for each specialist with full access:

```
Email: cody.landtroop@rotech.com
Role: accreditationSpecialist
locationId: (leave null)
areaId: (leave null)
regionId: (leave null - they see all)
```

---

## TESTING THE APP

### Test as Location Manager

1. Login with location manager credentials
2. You should see:
   - Your location name & Lawson #
   - Assessment status cards (OP 541, OP 512, JC 427)
   - Option to start assessments
   - Link to Survey Prep App

3. Click on OP 541 and fill out a few items
4. Progress bar should update
5. Submit the form (requires all items answered)
6. You should see "✓ Submitted successfully"
7. Go back and see the status changed to "✓ Submitted"

### Test as Area Manager

1. Logout and login as area manager
2. You should see:
   - All locations in your assigned area
   - Submission status for each location (Pending, Partial, Complete)
   - Metrics dashboard showing completion rate

### Test as Region Admin

1. Logout and login as region admin
2. You should see:
   - Company-wide metrics
   - All area managers in region with their completion status
   - Export Reports button (links to Phase 2 features)

---

## NEXT STEPS (Phase 2)

### What's Coming:

- **Export Reports** - Download submissions as Excel files
- **Trend Analysis** - Track readiness over time
- **Deficiency Tracking** - Log and follow up on issues
- **Automated Reminders** - Email notifications for overdue submissions
- **Integration with Survey Prep** - Linked readiness & survey data
- **Mobile App** - iOS/Android native apps
- **Multi-region Import** - Bulk user & location creation

### Timeline:
- Phase 2 (Weeks 5-7): Dashboards + Export + Trends
- Phase 3 (Weeks 8-9): Integration + Advanced Analytics
- Phase 4 (Weeks 10-12): Mobile + Final QA

---

## TROUBLESHOOTING

### App Won't Load

**Problem:** Blank white screen or error
- Check browser console (F12) for JavaScript errors
- Verify Firebase config is correct in `src/lib/firebase.js`
- Make sure Firebase project exists at console.firebase.google.com

### Login Fails

**Problem:** "Invalid user or wrong password"
- Make sure Firebase Auth is enabled (Step 2.1)
- Verify user exists in Firebase Auth console
- Make sure user document exists in Firestore with correct role

### Can't See Locations

**Problem:** Error "Location data could not be loaded"
- Make sure import was run (Step 3.1)
- Check Firestore console → locations collection
- Verify locationId in user document matches a location ID

### Submissions Not Saving

**Problem:** "Error submitting form"
- Check Firestore security rules are applied (Step 2.2)
- Make sure user role is correct in Firestore
- Check browser console for error details
- Verify Firestore database quota not exceeded

### GitHub Pages Deploy Fails

**Problem:** `npm run deploy` gives permission error
- Run: `gh auth login` (requires GitHub CLI)
- Or configure GitHub token locally
- Or manually push to GitHub and enable Pages in repo settings

---

## MONITORING & MAINTENANCE

### Regular Checks:

1. **Firestore Usage** - Monitor in Firebase console
   - Current free tier: 50K reads/day, 20K writes/day
   - Watch for approaching limits
   - Scale to Blaze plan if needed (pay-as-you-go)

2. **Authentication** - Monitor failed login attempts
   - Firebase Console → Auth → Sign-in method settings

3. **User Accounts** - Audit regularly
   - Archive/remove old accounts
   - Keep user list in sync with location changes

4. **Submission Rates** - Track progress
   - Use Region Admin dashboard
   - Send reminders for overdue submissions

---

## QUICK REFERENCE

### Important URLs

- **Live App:** https://clandtroop.github.io/rotech-semiannual/
- **Firebase Console:** https://console.firebase.google.com
- **GitHub Repo:** https://github.com/clandtroop/rotech-semiannual
- **Survey Prep App:** https://clandtroop.github.io/rotech-survey-prep/

### Key Files

- `src/lib/firebase.js` - Firebase config
- `src/components/Login.jsx` - Login form
- `src/components/dashboards/LocationManagerDash.jsx` - Main submission interface
- `src/utils/importData.js` - Data import utility
- `FIRESTORE_RULES.txt` - Security rules

### Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server (port 5173)
npm run build            # Build for production
npm run deploy           # Deploy to GitHub Pages
```

---

## SUPPORT

For questions or issues:

1. Check this guide first
2. Review browser console (F12) for errors
3. Check Firestore console for data issues
4. Contact: cody.landtroop@rotech.com

---

**Last Updated:** July 2026  
**Version:** 1.0.0 - Phase 1 Complete
