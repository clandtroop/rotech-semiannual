// =====================================================
// LOCATION & USER DATA IMPORT UTILITY
// =====================================================
// This utility helps populate Firestore with locations, area managers, 
// and region data from the June 2026 rosters.
//
// HOW TO USE:
// 1. Copy this file to src/utils/importData.js
// 2. Import into your app temporarily: import { importAllData } from './utils/importData';
// 3. Call importAllData() in your browser console after logging in as accreditationSpecialist
// 4. Monitor Firestore console to verify data was added
// 5. Remove/disable the import call when done

import { db } from '../lib/firebase';
import { collection, addDoc, setDoc, doc, writeBatch } from 'firebase/firestore';

// REGION 8 LOCATIONS (from uploaded PDF)
const REGION_8_LOCATIONS = [
  // AREA 2 - Cassidy Williams
  { lawsonNumber: '121510', name: 'Rotech', city: 'Beaverton', state: 'OR', areaId: 'A2', regionId: 'R8' },
  { lawsonNumber: '120310', name: 'Rotech', city: 'Eugene', state: 'OR', areaId: 'A2', regionId: 'R8' },
  { lawsonNumber: '72010', name: 'Rotech', city: 'Idaho Falls', state: 'ID', areaId: 'A2', regionId: 'R8' },
  { lawsonNumber: '120210', name: 'Rotech', city: 'Medford', state: 'OR', areaId: 'A2', regionId: 'R8' },
  { lawsonNumber: '74410', name: 'Rotech', city: 'Renton', state: 'WA', areaId: 'A2', regionId: 'R8' },
  { lawsonNumber: '619810', name: 'Rotech', city: 'Silverdale', state: 'WA', areaId: 'A2', regionId: 'R8' },
  { lawsonNumber: '72310', name: 'Homecare Medical', city: 'Soda Springs', state: 'ID', areaId: 'A2', regionId: 'R8' },
  { lawsonNumber: '619210', name: 'Rotech', city: 'Spokane', state: 'WA', areaId: 'A2', regionId: 'R8' },
  { lawsonNumber: '619110', name: 'NCW Respiratory Care', city: 'Wenatchee', state: 'WA', areaId: 'A2', regionId: 'R8' },

  // AREA 3 - Lisa Durgain
  { lawsonNumber: '627010', name: 'Rotech', city: 'Billings', state: 'MT', areaId: 'A3', regionId: 'R8' },
  { lawsonNumber: '627510', name: 'Rotech', city: 'Great Falls', state: 'MT', areaId: 'A3', regionId: 'R8' },
  { lawsonNumber: '627130', name: 'Rotech', city: 'Bozeman', state: 'MT', areaId: 'A3', regionId: 'R8' },
  { lawsonNumber: '627210', name: 'Rotech', city: 'Butte', state: 'MT', areaId: 'A3', regionId: 'R8' },
  { lawsonNumber: '631310', name: 'Rotech', city: 'Casper', state: 'WY', areaId: 'A3', regionId: 'R8' },
  { lawsonNumber: '632810', name: 'Rotech', city: 'Cheyenne', state: 'WY', areaId: 'A3', regionId: 'R8' },
  { lawsonNumber: '631810', name: 'Rotech', city: 'Cody', state: 'WY', areaId: 'A3', regionId: 'R8' },
  { lawsonNumber: '628410', name: 'Rotech', city: 'Hardin', state: 'MT', areaId: 'A3', regionId: 'R8' },
  { lawsonNumber: '627910', name: 'Rotech', city: 'Helena', state: 'MT', areaId: 'A3', regionId: 'R8' },
  { lawsonNumber: '632210', name: 'Rotech', city: 'Laramie', state: 'WY', areaId: 'A3', regionId: 'R8' },
  { lawsonNumber: '628110', name: 'Rotech', city: 'Miles City', state: 'MT', areaId: 'A3', regionId: 'R8' },
  { lawsonNumber: '632510', name: 'Rotech', city: 'Rock Springs', state: 'WY', areaId: 'A3', regionId: 'R8' },
  { lawsonNumber: '632110', name: 'Rotech', city: 'Sheridan', state: 'WY', areaId: 'A3', regionId: 'R8' },
  { lawsonNumber: '632010', name: 'Rotech', city: 'Wheatland', state: 'WY', areaId: 'A3', regionId: 'R8' },

  // AREA 4 - Brian Duffell (Arizona/Utah)
  { lawsonNumber: '631010', name: 'Rotech', city: 'Flagstaff', state: 'AZ', areaId: 'A4', regionId: 'R8' },
  { lawsonNumber: '10010', name: 'Rotech', city: 'Layton', state: 'UT', areaId: 'A4', regionId: 'R8' },
  { lawsonNumber: '690410', name: 'Rotech', city: 'Mesa', state: 'AZ', areaId: 'A4', regionId: 'R8' },
  { lawsonNumber: '122310', name: 'Rotech', city: 'Orem', state: 'UT', areaId: 'A4', regionId: 'R8' },
  { lawsonNumber: '630410', name: 'Rotech', city: 'Payson', state: 'AZ', areaId: 'A4', regionId: 'R8' },
  { lawsonNumber: '630610', name: 'The Oxygen Store', city: 'Peoria', state: 'AZ', areaId: 'A4', regionId: 'R8' },
  { lawsonNumber: '690110', name: 'Rotech', city: 'Prescott', state: 'AZ', areaId: 'A4', regionId: 'R8' },
  { lawsonNumber: '631110', name: 'Sentry Home Health', city: 'Show Low', state: 'AZ', areaId: 'A4', regionId: 'R8' },
  { lawsonNumber: '630110', name: 'Rotech', city: 'Tucson', state: 'AZ', areaId: 'A4', regionId: 'R8' },
  { lawsonNumber: '137510', name: 'Rotech', city: 'West Valley City', state: 'UT', areaId: 'A4', regionId: 'R8' },

  // AREA 6 - Kristi Kellogg (Colorado/Hawaii)
  { lawsonNumber: '76910', name: 'Summit Respiratory', city: 'Colorado Springs (N)', state: 'CO', areaId: 'A6', regionId: 'R8' },
  { lawsonNumber: '651310', name: 'Summit Respiratory', city: 'Colorado Springs (S)', state: 'CO', areaId: 'A6', regionId: 'R8' },
  { lawsonNumber: '651010', name: 'Summit Respiratory', city: 'Denver', state: 'CO', areaId: 'A6', regionId: 'R8' },
  { lawsonNumber: '91510', name: 'Aloha Respiratory', city: 'Honolulu', state: 'HI', areaId: 'A6', regionId: 'R8' },
  { lawsonNumber: '76810', name: 'Summit Respiratory', city: 'Lakewood', state: 'CO', areaId: 'A6', regionId: 'R8' },
  { lawsonNumber: '651110', name: 'Roth Medical', city: 'Westminster', state: 'CO', areaId: 'A6', regionId: 'R8' },

  // AREA 7 - Joetta Bryant (Western Colorado/Utah)
  { lawsonNumber: '650910', name: 'Rotech', city: 'Alamosa', state: 'CO', areaId: 'A7', regionId: 'R8' },
  { lawsonNumber: '651710', name: 'A-Med Supply', city: 'Cortez', state: 'CO', areaId: 'A7', regionId: 'R8' },
  { lawsonNumber: '608510', name: 'G & G Medical', city: 'Craig', state: 'CO', areaId: 'A7', regionId: 'R8' },
  { lawsonNumber: '662810', name: 'Oxygen Plus', city: 'Delta', state: 'CO', areaId: 'A7', regionId: 'R8' },
  { lawsonNumber: '650610', name: 'A-Med Supply', city: 'Durango', state: 'CO', areaId: 'A7', regionId: 'R8' },
  { lawsonNumber: '651210', name: 'Roth Medical', city: 'Ft. Collins', state: 'CO', areaId: 'A7', regionId: 'R8' },
  { lawsonNumber: '662910', name: 'Don Paul Resp. Services', city: 'Ft. Morgan', state: 'CO', areaId: 'A7', regionId: 'R8' },
  { lawsonNumber: '608310', name: 'G & G Medical', city: 'Grand Junction', state: 'CO', areaId: 'A7', regionId: 'R8' },
  { lawsonNumber: '652010', name: 'Roth Medical', city: 'Lamar', state: 'CO', areaId: 'A7', regionId: 'R8' },
  { lawsonNumber: '651410', name: 'Roth Medical', city: 'Pueblo', state: 'CO', areaId: 'A7', regionId: 'R8' },
  { lawsonNumber: '662310', name: 'Medco Professionals', city: 'Trinidad', state: 'CO', areaId: 'A7', regionId: 'R8' },
  { lawsonNumber: '9310', name: 'Valley Home Medical', city: 'Vernal', state: 'UT', areaId: 'A7', regionId: 'R8' },
  { lawsonNumber: '662210', name: 'Don Paul Resp. Services', city: 'Windsor', state: 'CO', areaId: 'A7', regionId: 'R8' },
];

// AREA MANAGERS
const AREA_MANAGERS = [
  { areaId: 'A2', regionId: 'R8', name: 'Cassidy Williams', email: 'cassidy.williams@rotech.com', phone: '(425) 350-0107' },
  { areaId: 'A3', regionId: 'R8', name: 'Lisa Durgain', email: 'lisa.durgain@rotech.com', phone: '(970) 231-9549' },
  { areaId: 'A4', regionId: 'R8', name: 'Brian Duffell', email: 'brian.duffell@rotech.com', phone: '(602) 214-6695' },
  { areaId: 'A6', regionId: 'R8', name: 'Kristi Kellogg', email: 'kristi.kellogg@rotech.com', phone: '(303) 881-4727' },
  { areaId: 'A7', regionId: 'R8', name: 'Joetta Bryant', email: 'joetta.bryant@rotech.com', phone: '(719) 251-1685' },
];

// REGION INFO
const REGIONS = [
  { regionId: 'R8', name: 'Region 8', directorName: 'Josh Connell', directorEmail: 'jconnell@rotech.com' },
];

// =====================================================
// IMPORT FUNCTIONS
// =====================================================

export async function importLocations() {
  console.log('Starting location import...');
  const batch = writeBatch(db);
  let count = 0;

  for (const location of REGION_8_LOCATIONS) {
    const docRef = doc(db, 'locations', location.lawsonNumber);
    batch.set(docRef, location);
    count++;
  }

  await batch.commit();
  console.log(`✅ Imported ${count} locations`);
  return count;
}

export async function importAreaManagers() {
  console.log('Starting area manager import...');
  const batch = writeBatch(db);
  let count = 0;

  for (const am of AREA_MANAGERS) {
    const docRef = doc(db, 'area_managers', `${am.regionId}_${am.areaId}`);
    batch.set(docRef, am);
    count++;
  }

  await batch.commit();
  console.log(`✅ Imported ${count} area managers`);
  return count;
}

export async function importRegions() {
  console.log('Starting region import...');
  const batch = writeBatch(db);
  let count = 0;

  for (const region of REGIONS) {
    const docRef = doc(db, 'regions', region.regionId);
    batch.set(docRef, region);
    count++;
  }

  await batch.commit();
  console.log(`✅ Imported ${count} regions`);
  return count;
}

export async function importAllData() {
  try {
    console.log('🚀 Starting full data import...');
    await importRegions();
    await importLocations();
    await importAreaManagers();
    console.log('✅ ALL DATA IMPORTED SUCCESSFULLY!');
    console.log('Now you need to manually create user accounts for Location Managers');
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
}

// =====================================================
// TO USE THIS:
// =====================================================
// 1. In App.jsx, add:
//    import { importAllData } from './utils/importData';
//    window.importAllData = importAllData;
//
// 2. Open browser console and run:
//    await importAllData()
//
// 3. Check Firestore to verify data was added
// 4. Remove the window.importAllData line from App.jsx
