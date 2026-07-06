# rotech-semiannual
Semi Annual Review App
# Location Readiness Semi-Annual Assessment Platform

**rotech-semiannual** is a web-based platform for Rotech Healthcare locations to submit semi-annual readiness assessments (OP 541, OP 512, JC 427) and for management to track compliance across all regions.

---

## Overview

Locations complete readiness checklists twice yearly (Q1-Q2: Jan-Jun, Q3-Q4: Jul-Dec):
- **OP 541** - Facility Readiness (~60 items)
- **OP 512** - Facility Safety Inspection (32 items)
- **JC 427** - Personnel Records Review (~30 items)

### User Roles

- **Location Managers** - Submit assessments for their assigned location
- **Area Managers** - View submission status and metrics for locations in assigned areas
- **Region Admins** - View company-wide rollup, export reports
- **Accreditation Specialists** - Full read/write access to all locations, all regions

---

## Tech Stack

- **Frontend:** React 18 + Vite
- **Backend:** Firebase Firestore
- **Auth:** Firebase Authentication
- **Hosting:** GitHub Pages
- **Styling:** Tailwind CSS

---

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Firebase account
- GitHub account

### Installation

1. **Clone the repo:**
   ```bash
   git clone https://github.com/[yourname]/rotech-semiannual.git
   cd rotech-semiannual
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Firebase:**
   - Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Firestore Database (test mode initially)
   - Enable Firebase Authentication (Email/Password)
   - Copy your Firebase config

4. **Create `.env.local` file in project root:**
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. **Run locally:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
rotech-semiannual/
├── src/
│   ├── components/
│   │   ├── Login.jsx              # Login page (4 role types)
│   │   ├── forms/
│   │   │   ├── OP541Form.jsx      # Facility Readiness form
│   │   │   ├── OP512Form.jsx      # Safety Inspection form
│   │   │   └── JC427Form.jsx      # Personnel Records form
│   │   ├── dashboards/
│   │   │   ├── LocationManagerDash.jsx
│   │   │   ├── AreaManagerDash.jsx
│   │   │   ├── RegionAdminDash.jsx
│   │   │   └── AccreditationDash.jsx
│   │   └── Navigation.jsx
│   ├── lib/
│   │   ├── firebase.js             # Firebase config & setup
│   │   ├── auth.js                 # Auth helper functions
│   │   └── firestore.js            # Firestore CRUD operations
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── public/
│   └── Rotech_Logo.jpg
├── .env.local                      # (Create locally, add to .gitignore)
├── .gitignore
├── vite.config.js
├── package.json
└── README.md
```

---

## Features

### Phase 1 (Current)
- ✅ Role-based login (Location Manager, Area Manager, Region Admin, Accreditation Specialist)
- ✅ OP 541 submission form
- ✅ OP 512 submission form
- ✅ JC 427 submission form
- ✅ Auto-save draft functionality
- ✅ Submission timestamp & audit trail

### Phase 2 (Next)
- Area Manager dashboard (submission status, location metrics)
- Region Admin dashboard (company-wide rollup)
- Export reports (Excel)
- Integration with Survey Prep App

### Phase 3 (Future)
- Trend analysis & readiness scoring
- Automated reminders for overdue submissions
- Mobile-responsive enhancements

---

## Deployment

### GitHub Pages

1. **Update `vite.config.js`:**
   ```javascript
   export default {
     base: '/rotech-semiannual/',
     // ... rest of config
   }
   ```

2. **Build & deploy:**
   ```bash
   npm run build
   npm run deploy
   ```

3. **Access live app:**
   ```
   https://[yourname].github.io/rotech-semiannual/
   ```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |

---

## Firestore Schema

### Collections

**users**
- `uid` → `{ email, role, locationId, areaId, regionId, name }`

**locations**
- `locationId` → `{ lawsonNumber, name, city, state, areaId, regionId, lcmEmail, lcmPhone }`

**assessments**
- `assessmentId` → `{ locationId, quarter, type (OP541/OP512/JC427), submittedDate, status }`

**responses**
- `responseId` → `{ assessmentId, itemId, answer, comments }`

---

## FAQs

**Q: How do Location Managers log in?**  
A: Email/password login. Their location is auto-loaded based on their user profile.

**Q: Can users change their password?**  
A: Yes, via "Forgot Password" on login page (Firebase handles this).

**Q: What if a location is assigned to multiple areas?**  
A: Currently one location → one area. Contact dev if edge cases exist.

**Q: How do I add new locations?**  
A: Upload location roster via Firestore console or admin import tool (built in Phase 2).

---

## Support & Issues

For questions or bugs:
1. Check existing [Issues](../../issues)
2. Create a new issue with details
3. Contact Cody Landtroop (cody.landtroop@rotech.com)

---

## License

Internal Rotech Healthcare use only.

---

## Changelog

### v0.1.0 (Initial Release)
- Login system (4 roles)
- OP 541, OP 512, JC 427 submission forms
- Firebase auth & Firestore integration
- Draft auto-save

---

**Last Updated:** July 2026  
**Maintainer:** Cody Landtroop (Accreditation Specialist, Region 8)