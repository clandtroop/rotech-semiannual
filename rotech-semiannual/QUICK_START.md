# ⚡ QUICK START - 5 MINUTES TO LIVE

## What You Have

A fully functional Location Readiness Platform with:
- ✅ Firebase authentication ready to go
- ✅ 3 assessment forms (OP 541, OP 512, JC 427)
- ✅ 4 user role dashboards
- ✅ Firestore integration
- ✅ GitHub Pages deployment

---

## THE 5-MINUTE SETUP

### 1️⃣ Enable Firebase Auth (2 mins)

```
1. Go to console.firebase.google.com
2. Select "rotech-location-readiness" project
3. Click "Authentication" (left menu)
4. Click "Email/Password" and enable it
5. Click "Save"
```

### 2️⃣ Apply Firestore Rules (1 min)

```
1. In Firebase console, go to "Firestore Database"
2. Click "Rules" tab
3. Paste content from FIRESTORE_RULES.txt into editor
4. Click "Publish"
```

### 3️⃣ Deploy to GitHub Pages (2 mins)

```bash
npm install
npm run build
npm run deploy
```

**✅ App is now live at:** `https://clandtroop.github.io/rotech-semiannual/`

---

## TEST IT

### Create a Test User

1. Go to Firebase Auth console
2. Click "Add user"
3. Create: `test@rotech.com` / `test123`
4. Click "Add user"
5. Copy the user UID

### Link to Location

1. Go to Firestore
2. Create document in `users` collection
3. Document ID = the UID you just copied
4. Add fields:
   ```
   email: "test@rotech.com"
   role: "locationManager"
   locationId: "121510"
   areaId: "A2"
   regionId: "R8"
   ```
5. Click "Save"

### Login & Test

1. Go to `https://clandtroop.github.io/rotech-semiannual/`
2. Login with: `test@rotech.com` / `test123`
3. Select role: "Location Manager"
4. You should see Beaverton, OR location
5. Click on OP 541 and try filling out items
6. Submit a form

---

## IMPORT REGION 8 DATA

### Add All Locations at Once

```javascript
// 1. Open browser console (F12)
// 2. Run this:

const locations = [
  {id: '121510', name: 'Beaverton', city: 'Beaverton', state: 'OR', areaId: 'A2', regionId: 'R8'},
  {id: '120310', name: 'Eugene', city: 'Eugene', state: 'OR', areaId: 'A2', regionId: 'R8'},
  // ... see src/utils/importData.js for full list
];

// Or use the helper:
await importAllData();
```

---

## NEXT STEPS

1. **Create more users** for Location Managers in your locations
2. **Test with different roles** (Area Manager, Region Admin)
3. **Review Phase 2 roadmap** for export, trends, integrations
4. **Share login link** with your team

---

## TROUBLESHOOTING

| Problem | Fix |
|---------|-----|
| App won't load | Check browser console (F12), verify Firebase config |
| Can't login | Make sure user exists in Firebase Auth + Firestore |
| No locations appear | Run `importAllData()` in console |
| Submissions fail | Check Firestore rules are applied |
| Deploy fails | Run `npm install` first, then `npm run deploy` |

---

## KEY COMMANDS

```bash
npm install              # Install once
npm run dev              # Local testing (http://localhost:5173)
npm run build            # Prepare for deployment
npm run deploy           # Live on GitHub Pages
```

---

## LIVE APP URL

```
https://clandtroop.github.io/rotech-semiannual/
```

---

**That's it! You now have a working Location Readiness Platform.** 🎉

For detailed setup, see `SETUP_GUIDE.md`
