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

// REGION 2 LOCATIONS (from uploaded PDF)
const REGION_2_LOCATIONS = [
  // AREA 1 - Brenda Perry
  { lawsonNumber: '200210', name: 'BP Gamma Medical Supply', city: 'Frederick', state: 'MD', areaId: 'A1', regionId: 'R2' },
  { lawsonNumber: '92110', name: 'Rotech', city: 'Glen Burnie', state: 'MD', areaId: 'A1', regionId: 'R2' },
  { lawsonNumber: '133210', name: 'Medic-Aire Medical Equipment', city: 'Prince Frederick', state: 'MD', areaId: 'A1', regionId: 'R2' },

  // AREA 2 - Walter "Buddy" Volinski
  { lawsonNumber: '200510', name: 'Best Home Medical', city: 'Barboursville', state: 'WV', areaId: 'A2', regionId: 'R2' },
  { lawsonNumber: '6810', name: 'Rotech Home Medical Care', city: 'Christiansburg', state: 'VA', areaId: 'A2', regionId: 'R2' },
  { lawsonNumber: '67510', name: 'Laurel Mountain Medical', city: 'Clarksburg', state: 'WV', areaId: 'A2', regionId: 'R2' },
  { lawsonNumber: '123010', name: 'Rotech', city: 'Charleston', state: 'WV', areaId: 'A2', regionId: 'R2' },
  { lawsonNumber: '68010', name: 'Pioneer Medical Services', city: 'Man', state: 'WV', areaId: 'A2', regionId: 'R2' },
  { lawsonNumber: '67910', name: 'Pioneer Medical Services', city: 'Mount Hope', state: 'WV', areaId: 'A2', regionId: 'R2' },
  { lawsonNumber: '200410', name: 'Best Medical Equipment', city: 'Nitro', state: 'WV', areaId: 'A2', regionId: 'R2' },
  { lawsonNumber: '123210', name: "Andy Boyd's Inhome Medical", city: 'Parkersburg', state: 'WV', areaId: 'A2', regionId: 'R2' },
  { lawsonNumber: '6610', name: 'Rotech Home Medical Care', city: 'Pearisburg', state: 'VA', areaId: 'A2', regionId: 'R2' },
  { lawsonNumber: '6410', name: 'Rotech Home Medical Care', city: 'Roanoke', state: 'VA', areaId: 'A2', regionId: 'R2' },

  // AREA 3 - Dawn Ragukas
  { lawsonNumber: '135010', name: 'First Community Care', city: 'Amherst', state: 'NY', areaId: 'A3', regionId: 'R2' },
  { lawsonNumber: '201320', name: 'Better Living Now', city: 'Hauppauge', state: 'NY', areaId: 'A3', regionId: 'R2' },
  { lawsonNumber: '47510', name: 'Rotech', city: 'Bloomsburg', state: 'PA', areaId: 'A3', regionId: 'R2' },
  { lawsonNumber: '47310', name: 'Rotech', city: 'Dickson City', state: 'PA', areaId: 'A3', regionId: 'R2' },
  { lawsonNumber: '135210', name: 'First Community Care', city: 'East Syracuse', state: 'NY', areaId: 'A3', regionId: 'R2' },
  { lawsonNumber: '135710', name: 'North Country Medical', city: 'Malone', state: 'NY', areaId: 'A3', regionId: 'R2' },
  { lawsonNumber: '48810', name: 'Rotech', city: 'Mifflinburg', state: 'PA', areaId: 'A3', regionId: 'R2' },
  { lawsonNumber: '135910', name: 'North Country Medical', city: 'Potsdam', state: 'NY', areaId: 'A3', regionId: 'R2' },

  // AREA 4 - Michael Belmont
  { lawsonNumber: '46910', name: 'Rotech', city: 'Bensalem', state: 'PA', areaId: 'A4', regionId: 'R2' },
  { lawsonNumber: '200310', name: 'American Home Medical Equipment and Supplies', city: 'Bethlehem', state: 'PA', areaId: 'A4', regionId: 'R2' },
  { lawsonNumber: '133510', name: 'CPO2', city: 'Chambersburg', state: 'PA', areaId: 'A4', regionId: 'R2' },
  { lawsonNumber: '134610', name: 'Pulmonary Homecare', city: 'Mount Arlington', state: 'NJ', areaId: 'A4', regionId: 'R2' },
  { lawsonNumber: '105310', name: 'Rotech', city: 'Lewistown', state: 'PA', areaId: 'A4', regionId: 'R2' },
  { lawsonNumber: '92010', name: 'Rotech', city: 'Marlton', state: 'NJ', areaId: 'A4', regionId: 'R2' },
  { lawsonNumber: '47410', name: 'CPO2', city: 'Mechanicsburg', state: 'PA', areaId: 'A4', regionId: 'R2' },
  { lawsonNumber: '133310', name: 'Rotech', city: 'Pottsville', state: 'PA', areaId: 'A4', regionId: 'R2' },

  // AREA 5 - Scott Thompson
  { lawsonNumber: '156310', name: 'Rotech', city: 'Toledo', state: 'OH', areaId: 'A5', regionId: 'R2' },
  { lawsonNumber: '36110', name: 'Rotech of Crestview Hills', city: 'Erlanger', state: 'KY', areaId: 'A5', regionId: 'R2' },
  { lawsonNumber: '97310', name: "Hook's Oxygen & Medical Equipment", city: 'Dayton', state: 'OH', areaId: 'A5', regionId: 'R2' },
  { lawsonNumber: '97610', name: "Hook's Oxygen & Medical Equipment", city: 'Gahanna', state: 'OH', areaId: 'A5', regionId: 'R2' },
  { lawsonNumber: '35110', name: 'Rotech', city: 'Cincinnati', state: 'OH', areaId: 'A5', regionId: 'R2' },
  { lawsonNumber: '97510', name: 'Rotech', city: 'Milford', state: 'OH', areaId: 'A5', regionId: 'R2' },
  { lawsonNumber: '97810', name: "Hook's Oxygen & Medical Equipment", city: 'Springfield', state: 'OH', areaId: 'A5', regionId: 'R2' },
  { lawsonNumber: '98010', name: 'Rotech', city: 'Washington Court House', state: 'OH', areaId: 'A5', regionId: 'R2' },

  // AREA 6 - Taylor "Lee" Harris
  { lawsonNumber: '120110', name: 'Rotech', city: 'Cambridge', state: 'OH', areaId: 'A6', regionId: 'R2' },
  { lawsonNumber: '91710', name: 'Rotech', city: 'Erie', state: 'PA', areaId: 'A6', regionId: 'R2' },
  { lawsonNumber: '99710', name: 'Rotech', city: 'Girard', state: 'OH', areaId: 'A6', regionId: 'R2' },
  { lawsonNumber: '116510', name: 'HSM Medical', city: 'Jamestown', state: 'NY', areaId: 'A6', regionId: 'R2' },
  { lawsonNumber: '135510', name: 'Rotech', city: 'Monroeville', state: 'PA', areaId: 'A6', regionId: 'R2' },
  { lawsonNumber: '99610', name: 'Richards Medical', city: 'New Philadelphia', state: 'OH', areaId: 'A6', regionId: 'R2' },
  { lawsonNumber: '47910', name: 'Rotech', city: 'Oil City', state: 'PA', areaId: 'A6', regionId: 'R2' },
  { lawsonNumber: '97410', name: 'Rotech', city: 'Valley View', state: 'OH', areaId: 'A6', regionId: 'R2' },
  { lawsonNumber: '120810', name: 'Rotech', city: 'Washington', state: 'PA', areaId: 'A6', regionId: 'R2' },

  // AREA 8 - Tom Fontaine
  { lawsonNumber: '201810', name: 'Rotech', city: 'Bedford', state: 'NH', areaId: 'A8', regionId: 'R2' },
  { lawsonNumber: '136510', name: 'Rotech', city: 'Cranston', state: 'RI', areaId: 'A8', regionId: 'R2' },
  { lawsonNumber: '121910', name: 'Rotech', city: 'Cromwell', state: 'CT', areaId: 'A8', regionId: 'R2' },
  { lawsonNumber: '137410', name: 'Rotech', city: 'Methuen', state: 'MA', areaId: 'A8', regionId: 'R2' },
  { lawsonNumber: '155010', name: 'Rotech', city: 'Presque Isle', state: 'ME', areaId: 'A8', regionId: 'R2' },
  { lawsonNumber: '201610', name: 'Rotech', city: 'Auburn', state: 'ME', areaId: 'A8', regionId: 'R2' },
  { lawsonNumber: '155310', name: 'Rotech', city: 'Hampden', state: 'ME', areaId: 'A8', regionId: 'R2' },
  { lawsonNumber: '201710', name: 'Rotech', city: 'Southborough', state: 'MA', areaId: 'A8', regionId: 'R2' },
];

// REGION 3 LOCATIONS (from uploaded PDF)
const REGION_3_LOCATIONS = [
  // AREA 1 - Mindy Mills
  { lawsonNumber: '23410', name: 'Rotech', city: 'Clinton', state: 'NC', areaId: 'A1', regionId: 'R3' },
  { lawsonNumber: '14210', name: 'Rotech', city: 'Fayetteville', state: 'NC', areaId: 'A1', regionId: 'R3' },
  { lawsonNumber: '13410', name: 'Sun Medical Supply', city: 'Henderson', state: 'NC', areaId: 'A1', regionId: 'R3' },
  { lawsonNumber: '15810', name: 'Rotech', city: 'High Point', state: 'NC', areaId: 'A1', regionId: 'R3' },
  { lawsonNumber: '17510', name: 'Rotech', city: 'Myrtle Beach', state: 'SC', areaId: 'A1', regionId: 'R3' },
  { lawsonNumber: '14010', name: 'Rotech', city: 'Raleigh', state: 'NC', areaId: 'A1', regionId: 'R3' },
  { lawsonNumber: '16710', name: 'Ideal Home Medical', city: 'Rocky Mount', state: 'NC', areaId: 'A1', regionId: 'R3' },
  { lawsonNumber: '14110', name: 'Home Medical Systems', city: 'Whiteville', state: 'NC', areaId: 'A1', regionId: 'R3' },
  { lawsonNumber: '201110', name: 'Rotech', city: 'Wilmington', state: 'NC', areaId: 'A1', regionId: 'R3' },

  // AREA 2 - Brandy Nalley
  { lawsonNumber: '37210', name: 'Rotech of Corbin', city: 'Corbin', state: 'KY', areaId: 'A2', regionId: 'R3' },
  { lawsonNumber: '7710', name: 'Rotech of Central Kentucky', city: 'Elizabethtown', state: 'KY', areaId: 'A2', regionId: 'R3' },
  { lawsonNumber: '37310', name: 'Rotech of Frankfort', city: 'Frankfort', state: 'KY', areaId: 'A2', regionId: 'R3' },
  { lawsonNumber: '37110', name: 'Rotech of Hazard', city: 'Hazard', state: 'KY', areaId: 'A2', regionId: 'R3' },
  { lawsonNumber: '8110', name: 'Rotech', city: 'Jeffersonville', state: 'IN', areaId: 'A2', regionId: 'R3' },
  { lawsonNumber: '37710', name: 'Rotech of Lexington', city: 'Lexington', state: 'KY', areaId: 'A2', regionId: 'R3' },
  { lawsonNumber: '7210', name: 'Rotech of Central Kentucky', city: 'Louisville', state: 'KY', areaId: 'A2', regionId: 'R3' },
  { lawsonNumber: '37610', name: 'Rotech of Pikeville', city: 'Pikeville', state: 'KY', areaId: 'A2', regionId: 'R3' },
  { lawsonNumber: '7510', name: 'Rotech of Richmond', city: 'Richmond', state: 'KY', areaId: 'A2', regionId: 'R3' },
  { lawsonNumber: '117710', name: 'Rotech of Somerset', city: 'Somerset', state: 'KY', areaId: 'A2', regionId: 'R3' },

  // AREA 3 - Aleksandr Povarich
  { lawsonNumber: '15910', name: 'Bluedot National Respiratory', city: 'Charlotte', state: 'NC', areaId: 'A3', regionId: 'R3' },
  { lawsonNumber: '13510', name: 'Rotech', city: 'Conover', state: 'NC', areaId: 'A3', regionId: 'R3' },
  { lawsonNumber: '14910', name: 'American Health Services', city: 'Gastonia', state: 'NC', areaId: 'A3', regionId: 'R3' },
  { lawsonNumber: '17210', name: 'American Health Services', city: 'Greenville', state: 'SC', areaId: 'A3', regionId: 'R3' },
  { lawsonNumber: '18210', name: 'Rotech', city: 'Lancaster', state: 'SC', areaId: 'A3', regionId: 'R3' },
  { lawsonNumber: '18610', name: 'Rotech', city: 'Lexington', state: 'SC', areaId: 'A3', regionId: 'R3' },
  { lawsonNumber: '14410', name: 'American Health Services', city: 'Lincolnton', state: 'NC', areaId: 'A3', regionId: 'R3' },
  { lawsonNumber: '16110', name: 'Monroe Home Medical', city: 'Monroe', state: 'NC', areaId: 'A3', regionId: 'R3' },
  { lawsonNumber: '14510', name: 'American Health Services', city: 'Mooresville', state: 'NC', areaId: 'A3', regionId: 'R3' },
  { lawsonNumber: '156010', name: 'Home Medical Systems', city: 'Summerville', state: 'SC', areaId: 'A3', regionId: 'R3' },

  // AREA 5 - OPEN (AM) / Shanon Hall (MSM)
  { lawsonNumber: '15210', name: 'Rotech', city: 'Asheville', state: 'NC', areaId: 'A5', regionId: 'R3' },
  { lawsonNumber: '22110', name: 'Rotech', city: 'Chattanooga', state: 'TN', areaId: 'A5', regionId: 'R3' },
  { lawsonNumber: '15510', name: "Kelley's Home Health Services", city: 'Franklin', state: 'NC', areaId: 'A5', regionId: 'R3' },
  { lawsonNumber: '107510', name: 'Rotech', city: 'Johnson City', state: 'TN', areaId: 'A5', regionId: 'R3' },
  { lawsonNumber: '41010', name: 'Rotech', city: 'Knoxville', state: 'TN', areaId: 'A5', regionId: 'R3' },
  { lawsonNumber: '107110', name: 'Rotech', city: 'Lafollette', state: 'TN', areaId: 'A5', regionId: 'R3' },
  { lawsonNumber: '23110', name: 'Rotech', city: 'Morristown', state: 'TN', areaId: 'A5', regionId: 'R3' },
  { lawsonNumber: '41710', name: 'Preferred Medical Equipment Company', city: 'Murfreesboro', state: 'TN', areaId: 'A5', regionId: 'R3' },
  { lawsonNumber: '15410', name: "Kelley's Home Health Services", city: 'Murphy', state: 'NC', areaId: 'A5', regionId: 'R3' },
  { lawsonNumber: '41210', name: 'Rotech', city: 'Nashville', state: 'TN', areaId: 'A5', regionId: 'R3' },
  { lawsonNumber: '107010', name: 'Rotech', city: 'Tazewell', state: 'TN', areaId: 'A5', regionId: 'R3' },
];

// REGION 5 LOCATIONS (from uploaded PDF)
const REGION_5_LOCATIONS = [
  // AREA 1 - Mark Paul
  { lawsonNumber: '26810', name: 'Rotech Oxygen & Medical Equipment', city: 'Fort Myers', state: 'FL', areaId: 'A1', regionId: 'R5' },
  { lawsonNumber: '138410', name: 'Rotech Oxygen & Medical Equipment', city: 'Hudson', state: 'FL', areaId: 'A1', regionId: 'R5' },
  { lawsonNumber: '510', name: 'Rotech Oxygen & Medical Equipment', city: 'Inverness', state: 'FL', areaId: 'A1', regionId: 'R5' },
  { lawsonNumber: '138510', name: 'Rotech Oxygen & Medical Equipment', city: 'Lakeland', state: 'FL', areaId: 'A1', regionId: 'R5' },
  { lawsonNumber: '138610', name: 'Rotech Oxygen & Medical Equipment', city: 'Largo', state: 'FL', areaId: 'A1', regionId: 'R5' },
  { lawsonNumber: '810', name: 'Rotech Oxygen & Medical Equipment', city: 'Leesburg', state: 'FL', areaId: 'A1', regionId: 'R5' },
  { lawsonNumber: '26410', name: 'Rotech Oxygen & Medical Equipment', city: 'Sarasota', state: 'FL', areaId: 'A1', regionId: 'R5' },
  { lawsonNumber: '1310', name: 'Rotech Oxygen & Medical Equipment', city: 'Tampa', state: 'FL', areaId: 'A1', regionId: 'R5' },
  { lawsonNumber: '8410', name: 'Rotech Oxygen & Medical Equipment', city: 'Ocala', state: 'FL', areaId: 'A1', regionId: 'R5' },

  // AREA 2 - Shannon Hutson
  { lawsonNumber: '202420', name: 'Rotech Oxygen & Medical Equipment', city: 'Cumming', state: 'GA', areaId: 'A2', regionId: 'R5' },
  { lawsonNumber: '137910', name: 'Abba Medical Equipment', city: 'Cartersville', state: 'GA', areaId: 'A2', regionId: 'R5' },
  { lawsonNumber: '25110', name: 'Rotech Oxygen & Medical Equipment', city: 'Villa Rica', state: 'GA', areaId: 'A2', regionId: 'R5' },
  { lawsonNumber: '24310', name: 'Home Medical Systems', city: 'Duluth', state: 'GA', areaId: 'A2', regionId: 'R5' },
  { lawsonNumber: '23610', name: 'Pickens Medical Supply', city: 'Jasper', state: 'GA', areaId: 'A2', regionId: 'R5' },
  { lawsonNumber: '117410', name: 'Corley Home Health Care', city: 'Lagrange', state: 'GA', areaId: 'A2', regionId: 'R5' },
  { lawsonNumber: '16210', name: 'Georgia Medical Resources', city: 'Marietta', state: 'GA', areaId: 'A2', regionId: 'R5' },

  // AREA 3 - Wanda Kavades
  { lawsonNumber: '8710', name: 'Rotech Oxygen & Medical Equipment', city: 'Davie', state: 'FL', areaId: 'A3', regionId: 'R5' },
  { lawsonNumber: '310', name: 'Rotech Oxygen & Medical Equipment', city: 'Deland', state: 'FL', areaId: 'A3', regionId: 'R5' },
  { lawsonNumber: '1910', name: 'Rotech Oxygen & Medical Equipment', city: 'Melbourne', state: 'FL', areaId: 'A3', regionId: 'R5' },
  { lawsonNumber: '710', name: 'Rotech Oxygen & Medical Equipment', city: 'Orlando', state: 'FL', areaId: 'A3', regionId: 'R5' },
  { lawsonNumber: '156110', name: 'Rotech Oxygen & Medical Equipment', city: 'Riviera Beach', state: 'FL', areaId: 'A3', regionId: 'R5' },
  { lawsonNumber: '9610', name: 'Rotech Oxygen & Medical Equipment', city: 'Stuart', state: 'FL', areaId: 'A3', regionId: 'R5' },

  // AREA 4 - Amber Fulghum
  { lawsonNumber: '22010', name: '1ST Choice Home Medical', city: 'Adel', state: 'GA', areaId: 'A4', regionId: 'R5' },
  { lawsonNumber: '22510', name: 'Southern Home Respiratory', city: 'Brunswick', state: 'GA', areaId: 'A4', regionId: 'R5' },
  { lawsonNumber: '21610', name: 'Rotech Oxygen & Medical Equipment', city: 'Douglas', state: 'GA', areaId: 'A4', regionId: 'R5' },
  { lawsonNumber: '210', name: 'Rotech Oxygen & Medical Equipment', city: 'Gainesville', state: 'FL', areaId: 'A4', regionId: 'R5' },
  { lawsonNumber: '26010', name: 'Rotech Oxygen & Medical Equipment', city: 'Garden City', state: 'GA', areaId: 'A4', regionId: 'R5' },
  { lawsonNumber: '1510', name: 'Rotech Oxygen & Medical Equipment', city: 'Jacksonville', state: 'FL', areaId: 'A4', regionId: 'R5' },
  { lawsonNumber: '1410', name: 'Rotech Oxygen & Medical Equipment', city: 'Marianna', state: 'FL', areaId: 'A4', regionId: 'R5' },
  { lawsonNumber: '910', name: "Patient's Choice Medical Services", city: 'Lynn Haven', state: 'FL', areaId: 'A4', regionId: 'R5' },
  // Note: no area was listed against these two rows in the source roster (they appear directly
  // under the Region 5 header on their own page). Assigned to Area 4 as the closest geographic
  // match (Pensacola FL / Statesboro GA are nearest this area's other stops) - confirm with Region 5 RD.
  { lawsonNumber: '9410', name: 'Rotech Oxygen & Medical Equipment', city: 'Pensacola', state: 'FL', areaId: 'A4', regionId: 'R5' },
  { lawsonNumber: '21010', name: 'Medical Equipment Professionals', city: 'Statesboro', state: 'GA', areaId: 'A4', regionId: 'R5' },

  // AREA 5 - Carla Ard
  { lawsonNumber: '79910', name: 'First Choice Medical', city: 'Alexander City', state: 'AL', areaId: 'A5', regionId: 'R5' },
  { lawsonNumber: '202320', name: "Valentine's Diabetic Supply", city: 'Birmingham', state: 'AL', areaId: 'A5', regionId: 'R5' },
  { lawsonNumber: '80410', name: 'Rotech Oxygen & Medical Equipment', city: 'Anniston', state: 'AL', areaId: 'A5', regionId: 'R5' },
  { lawsonNumber: '75010', name: 'Baumann\'s Home Medical and Respiratory', city: 'Dothan', state: 'AL', areaId: 'A5', regionId: 'R5' },
  { lawsonNumber: '633510', name: 'RN Homecare', city: 'Grenada', state: 'MS', areaId: 'A5', regionId: 'R5' },
  { lawsonNumber: '634110', name: 'Rotech Oxygen & Medical Equipment', city: 'Gulfport', state: 'MS', areaId: 'A5', regionId: 'R5' },
  { lawsonNumber: '633810', name: 'Rotech Home Medical Equipment', city: 'Hattiesburg', state: 'MS', areaId: 'A5', regionId: 'R5' },
  { lawsonNumber: '33010', name: 'Stat Medical Equipment', city: 'Meridian', state: 'MS', areaId: 'A5', regionId: 'R5' },
  { lawsonNumber: '633310', name: 'Rotech Home Medical Equipment', city: 'Richland', state: 'MS', areaId: 'A5', regionId: 'R5' },
  { lawsonNumber: '125810', name: 'First Choice Medical', city: 'Saraland', state: 'AL', areaId: 'A5', regionId: 'R5' },
  { lawsonNumber: '74910', name: 'Community Healthcare', city: 'Troy', state: 'AL', areaId: 'A5', regionId: 'R5' },
  { lawsonNumber: '633910', name: 'Rotech Home Medical Equipment', city: 'Tupelo', state: 'MS', areaId: 'A5', regionId: 'R5' },

  // AREA 7 - Damon Melton
  { lawsonNumber: '70710', name: 'Medical Technology of Louisiana', city: 'Alexandria', state: 'LA', areaId: 'A7', regionId: 'R5' },
  { lawsonNumber: '670210', name: 'Rotech Home Medical Equipment', city: 'Baton Rouge', state: 'LA', areaId: 'A7', regionId: 'R5' },
  { lawsonNumber: '646110', name: 'Samaritan Home Medical Equipment', city: 'Bossier City', state: 'LA', areaId: 'A7', regionId: 'R5' },
  { lawsonNumber: '670310', name: 'Taylor Home Health Supply', city: 'Broussard', state: 'LA', areaId: 'A7', regionId: 'R5' },
  { lawsonNumber: '670410', name: 'Taylor Home Health Supply', city: 'Harahan', state: 'LA', areaId: 'A7', regionId: 'R5' },
  { lawsonNumber: '670110', name: 'Rotech Home Medical Equipment', city: 'Lake Charles', state: 'LA', areaId: 'A7', regionId: 'R5' },
  { lawsonNumber: '70810', name: 'Medical Technology of Louisiana', city: 'Monroe', state: 'LA', areaId: 'A7', regionId: 'R5' },
  { lawsonNumber: '646310', name: 'Rotech Oxygen & Medical Equipment', city: 'Natchitoches', state: 'LA', areaId: 'A7', regionId: 'R5' },
];

// REGION 6 LOCATIONS (from uploaded PDF)
const REGION_6_LOCATIONS = [
  // AREA 1 - Jeffrey Ford
  { lawsonNumber: '612110', name: 'Rotech', city: 'Austin', state: 'TX', areaId: 'A1', regionId: 'R6' },
  { lawsonNumber: '617410', name: 'Rotech', city: 'Corpus Christi', state: 'TX', areaId: 'A1', regionId: 'R6' },
  { lawsonNumber: '640310', name: 'Major Medical', city: 'Del Rio', state: 'TX', areaId: 'A1', regionId: 'R6' },
  { lawsonNumber: '612610', name: 'Rotech', city: 'San Antonio', state: 'TX', areaId: 'A1', regionId: 'R6' },
  { lawsonNumber: '610310', name: 'Rotech', city: 'Uvalde', state: 'TX', areaId: 'A1', regionId: 'R6' },

  // AREA 2 - Debbie Stroud
  { lawsonNumber: '690610', name: 'Rotech', city: 'Lake Havasu City', state: 'AZ', areaId: 'A2', regionId: 'R6' },
  { lawsonNumber: '4710', name: 'Rotech', city: 'Las Vegas', state: 'NV', areaId: 'A2', regionId: 'R6' },
  { lawsonNumber: '120510', name: 'CalCare Medical', city: 'Pasadena', state: 'CA', areaId: 'A2', regionId: 'R6' },
  { lawsonNumber: '119710', name: 'Rotech', city: 'Santa Rosa', state: 'CA', areaId: 'A2', regionId: 'R6' },
  { lawsonNumber: '4610', name: 'Vital Care', city: 'Sparks', state: 'NV', areaId: 'A2', regionId: 'R6' },
  { lawsonNumber: '45510', name: 'Rotech', city: 'St. George', state: 'UT', areaId: 'A2', regionId: 'R6' },

  // AREA 3 - Michael Herrera
  { lawsonNumber: '668510', name: 'Rotech', city: 'Alamogordo', state: 'NM', areaId: 'A3', regionId: 'R6' },
  { lawsonNumber: '669610', name: 'Rotech', city: 'Albuquerque', state: 'NM', areaId: 'A3', regionId: 'R6' },
  { lawsonNumber: '615910', name: 'Major Medical', city: 'Clovis', state: 'NM', areaId: 'A3', regionId: 'R6' },
  { lawsonNumber: '640410', name: 'Major Medical Supply', city: 'El Paso', state: 'TX', areaId: 'A3', regionId: 'R6' },
  { lawsonNumber: '650810', name: 'A-Med Supply', city: 'Farmington', state: 'NM', areaId: 'A3', regionId: 'R6' },
  { lawsonNumber: '616410', name: 'Major Medical', city: 'Gallup', state: 'NM', areaId: 'A3', regionId: 'R6' },
  { lawsonNumber: '610510', name: 'Rotech', city: 'Las Cruces', state: 'NM', areaId: 'A3', regionId: 'R6' },
  { lawsonNumber: '669010', name: 'Roswell Home Medical', city: 'Roswell', state: 'NM', areaId: 'A3', regionId: 'R6' },
  { lawsonNumber: '623510', name: 'Rotech', city: 'Santa Fe', state: 'NM', areaId: 'A3', regionId: 'R6' },
  { lawsonNumber: '615710', name: 'Rotech', city: 'Silver City', state: 'NM', areaId: 'A3', regionId: 'R6' },
  { lawsonNumber: '667710', name: 'Premier Medical', city: 'Taos', state: 'NM', areaId: 'A3', regionId: 'R6' },

  // AREA 4 - Matthew Bailey
  { lawsonNumber: '613610', name: 'Caremor Health Services', city: 'Amarillo', state: 'TX', areaId: 'A4', regionId: 'R6' },
  { lawsonNumber: '642710', name: 'Marshalls Home Medical Equip.', city: 'Atlanta', state: 'TX', areaId: 'A4', regionId: 'R6' },
  { lawsonNumber: '658010', name: 'Camden Medical Supply', city: 'Camden', state: 'AR', areaId: 'A4', regionId: 'R6' },
  { lawsonNumber: '639310', name: 'Rotech', city: 'Hillsboro', state: 'TX', areaId: 'A4', regionId: 'R6' },
  { lawsonNumber: '659510', name: 'Marshalls Home Medical Equip.', city: 'Hope', state: 'AR', areaId: 'A4', regionId: 'R6' },
  { lawsonNumber: '610110', name: 'Major Medical', city: 'Lubbock', state: 'TX', areaId: 'A4', regionId: 'R6' },
  { lawsonNumber: '659610', name: 'Marshalls Home Medical Equipment', city: 'Magnolia', state: 'AR', areaId: 'A4', regionId: 'R6' },
  { lawsonNumber: '640110', name: 'Rotech', city: 'Odessa', state: 'TX', areaId: 'A4', regionId: 'R6' },
  { lawsonNumber: '602810', name: 'Rotech', city: 'Pampa', state: 'TX', areaId: 'A4', regionId: 'R6' },
  { lawsonNumber: '610210', name: 'Rhema Medical', city: 'Plainview', state: 'TX', areaId: 'A4', regionId: 'R6' },
  { lawsonNumber: '11510', name: 'Rotech', city: 'Temple', state: 'TX', areaId: 'A4', regionId: 'R6' },
  { lawsonNumber: '642910', name: 'Marshalls Home Medical Equip.', city: 'Texarkana', state: 'TX', areaId: 'A4', regionId: 'R6' },

  // AREA 5 - Stephanie McEuen
  { lawsonNumber: '642210', name: 'Taylor Home Health Supply', city: 'Beaumont', state: 'TX', areaId: 'A5', regionId: 'R6' },
  { lawsonNumber: '42510', name: 'Rotech', city: 'Bryan', state: 'TX', areaId: 'A5', regionId: 'R6' },
  { lawsonNumber: '642810', name: 'Rotech', city: 'Longview', state: 'TX', areaId: 'A5', regionId: 'R6' },
  { lawsonNumber: '642410', name: 'Rotech', city: 'Spring', state: 'TX', areaId: 'A5', regionId: 'R6' },
  { lawsonNumber: '642110', name: 'Rotech', city: 'Tyler', state: 'TX', areaId: 'A5', regionId: 'R6' },
  { lawsonNumber: '639910', name: 'Rhema Medical', city: 'Webster', state: 'TX', areaId: 'A5', regionId: 'R6' },

  // AREA 9 - Wendy Oxner
  { lawsonNumber: '610410', name: 'Rotech', city: 'Abilene', state: 'TX', areaId: 'A9', regionId: 'R6' },
  { lawsonNumber: '644210', name: 'Rhema Medical', city: 'Dallas', state: 'TX', areaId: 'A9', regionId: 'R6' },
  { lawsonNumber: '611610', name: 'Rhema Medical', city: 'Denton', state: 'TX', areaId: 'A9', regionId: 'R6' },
  { lawsonNumber: '644010', name: 'Rhema Medical', city: 'Fort Worth', state: 'TX', areaId: 'A9', regionId: 'R6' },
  { lawsonNumber: '639410', name: 'Texstar Medical Equip.', city: 'Granbury', state: 'TX', areaId: 'A9', regionId: 'R6' },
  { lawsonNumber: '611710', name: 'Rhema Medical', city: 'Greenville', state: 'TX', areaId: 'A9', regionId: 'R6' },
  { lawsonNumber: '604510', name: 'Rhema Medical', city: 'Irving', state: 'TX', areaId: 'A9', regionId: 'R6' },
  { lawsonNumber: '44610', name: 'Rhema Medical', city: 'Venus', state: 'TX', areaId: 'A9', regionId: 'R6' },
  { lawsonNumber: '639110', name: 'Ellis County Home Medical', city: 'Waxahachie', state: 'TX', areaId: 'A9', regionId: 'R6' },
];

// REGION 7 LOCATIONS (from uploaded PDF)
const REGION_7_LOCATIONS = [
  // AREA 1 - John 'David' Webb
  { lawsonNumber: '659710', name: 'Patient Rental Needs', city: 'Fort Smith', state: 'AR', areaId: 'A1', regionId: 'R7' },
  { lawsonNumber: '663510', name: 'American Medi-Serv', city: 'Lawton', state: 'OK', areaId: 'A1', regionId: 'R7' },
  { lawsonNumber: '661010', name: 'American Medical Services', city: 'McAlester', state: 'OK', areaId: 'A1', regionId: 'R7' },
  { lawsonNumber: '666010', name: 'Rotech', city: 'Oklahoma City', state: 'OK', areaId: 'A1', regionId: 'R7' },
  { lawsonNumber: '661510', name: 'Oxygen of Oklahoma', city: 'Shawnee', state: 'OK', areaId: 'A1', regionId: 'R7' },
  { lawsonNumber: '660010', name: 'Rotech', city: 'Springdale', state: 'AR', areaId: 'A1', regionId: 'R7' },
  { lawsonNumber: '661410', name: 'American Medical Rentals & Sales', city: 'Tulsa', state: 'OK', areaId: 'A1', regionId: 'R7' },
  { lawsonNumber: '611910', name: 'A-Plus Medical Equipment', city: 'Wichita Falls', state: 'TX', areaId: 'A1', regionId: 'R7' },

  // AREA 2 - Bryan Wink
  { lawsonNumber: '73310', name: 'Home Care Medical Equipment', city: 'Kansas City', state: 'MO', areaId: 'A2', regionId: 'R7' },
  { lawsonNumber: '4010', name: 'Home Care Medical Equipment', city: 'Lees Summit', state: 'MO', areaId: 'A2', regionId: 'R7' },
  { lawsonNumber: '73010', name: 'Rotech', city: 'Lenexa', state: 'KS', areaId: 'A2', regionId: 'R7' },
  { lawsonNumber: '118810', name: 'PSI Health Care', city: 'Omaha', state: 'NE', areaId: 'A2', regionId: 'R7' },
  { lawsonNumber: '73710', name: 'First Care', city: 'Pratt', state: 'KS', areaId: 'A2', regionId: 'R7' },
  { lawsonNumber: '3210', name: 'Rotech', city: 'Springfield', state: 'MO', areaId: 'A2', regionId: 'R7' },
  { lawsonNumber: '73810', name: 'First Care', city: 'Wichita', state: 'KS', areaId: 'A2', regionId: 'R7' },
  { lawsonNumber: '73820', name: 'First Care', city: 'Wichita', state: 'KS', areaId: 'A2', regionId: 'R7' },

  // AREA 3 - Rebecca Green
  { lawsonNumber: '660310', name: 'Heartland Home Health Care', city: 'Blytheville', state: 'AR', areaId: 'A3', regionId: 'R7' },
  { lawsonNumber: '603610', name: 'Heartland Home Health Care', city: 'Cape Girardeau', state: 'MO', areaId: 'A3', regionId: 'R7' },
  { lawsonNumber: '658410', name: 'Rotech', city: 'Conway', state: 'AR', areaId: 'A3', regionId: 'R7' },
  { lawsonNumber: '156910', name: 'Health-Way Medical Supply', city: 'Jonesboro', state: 'AR', areaId: 'A3', regionId: 'R7' },
  { lawsonNumber: '603410', name: 'Heartland Home Health Care', city: 'Kennett', state: 'MO', areaId: 'A3', regionId: 'R7' },
  { lawsonNumber: '58210', name: 'Rotech', city: 'Little Rock', state: 'AR', areaId: 'A3', regionId: 'R7' },
  { lawsonNumber: '641910', name: 'Preferred Medical Equipment Company', city: 'Memphis', state: 'TN', areaId: 'A3', regionId: 'R7' },
  { lawsonNumber: '156810', name: 'Rotech', city: 'Memphis', state: 'TN', areaId: 'A3', regionId: 'R7' },
  { lawsonNumber: '659010', name: 'Baxter Medical Equipment', city: 'Mountain Home', state: 'AR', areaId: 'A3', regionId: 'R7' },
  { lawsonNumber: '29210', name: 'Rotech of Mount Vernon', city: 'Mt Vernon', state: 'IL', areaId: 'A3', regionId: 'R7' },
  { lawsonNumber: '36310', name: 'Rotech of Western Kentucky', city: 'Paducah', state: 'KY', areaId: 'A3', regionId: 'R7' },
  { lawsonNumber: '657910', name: 'Health-Way Medical Supply', city: 'Pocahontas', state: 'AR', areaId: 'A3', regionId: 'R7' },
  { lawsonNumber: '600410', name: 'Health-Way Medical Supply', city: 'Searcy', state: 'AR', areaId: 'A3', regionId: 'R7' },

  // AREA 4 - Michele Smith
  { lawsonNumber: '99310', name: 'Rotech', city: 'Jacksonville', state: 'IL', areaId: 'A4', regionId: 'R7' },
  { lawsonNumber: '3910', name: 'Rotech', city: 'Kirksville', state: 'MO', areaId: 'A4', regionId: 'R7' },
  { lawsonNumber: '29310', name: 'Care Medical Supplies', city: "O'Fallon", state: 'IL', areaId: 'A4', regionId: 'R7' },
  { lawsonNumber: '98710', name: "Hook's Oxygen & Medical Equipment", city: 'Peoria', state: 'IL', areaId: 'A4', regionId: 'R7' },
  { lawsonNumber: '98810', name: 'Home Care Medical Equipment', city: 'Quincy', state: 'IL', areaId: 'A4', regionId: 'R7' },
  { lawsonNumber: '603710', name: 'Rotech', city: 'Sikeston', state: 'MO', areaId: 'A4', regionId: 'R7' },
  { lawsonNumber: '98610', name: 'Rotech', city: 'Springfield', state: 'IL', areaId: 'A4', regionId: 'R7' },
  { lawsonNumber: '125210', name: 'Rotech', city: 'St Louis', state: 'MO', areaId: 'A4', regionId: 'R7' },
  { lawsonNumber: '29510', name: 'Rotech of Urbana', city: 'Urbana', state: 'IL', areaId: 'A4', regionId: 'R7' },

  // AREA 5 - Jamie Forsberg
  { lawsonNumber: '102410', name: 'ABC Medical Supply', city: 'Cheboygan', state: 'MI', areaId: 'A5', regionId: 'R7' },
  { lawsonNumber: '99910', name: 'Rotech', city: 'Grand Rapids', state: 'MI', areaId: 'A5', regionId: 'R7' },
  { lawsonNumber: '105110', name: 'Great Lakes Home Medical', city: 'Iron River', state: 'MI', areaId: 'A5', regionId: 'R7' },
  { lawsonNumber: '4810', name: 'Medwest Medical Supply', city: 'Livonia', state: 'MI', areaId: 'A5', regionId: 'R7' },
  { lawsonNumber: '103710', name: 'Great Lakes Home Medical', city: 'Menominee', state: 'MI', areaId: 'A5', regionId: 'R7' },
  { lawsonNumber: '104910', name: 'Rotech', city: 'Midland', state: 'MI', areaId: 'A5', regionId: 'R7' },
  { lawsonNumber: '103910', name: 'Great Lakes Home Medical', city: 'Negaunee', state: 'MI', areaId: 'A5', regionId: 'R7' },
  { lawsonNumber: '7010', name: 'Professional Breathing Associates', city: 'Rochester Hills', state: 'MI', areaId: 'A5', regionId: 'R7' },
  { lawsonNumber: '114810', name: 'Great Lakes Home Medical', city: 'Traverse City', state: 'MI', areaId: 'A5', regionId: 'R7' },
  { lawsonNumber: '101910', name: 'ABC Medical Supply', city: 'West Branch', state: 'MI', areaId: 'A5', regionId: 'R7' },

  // AREA 6 - M 'Alex' Van Zant
  { lawsonNumber: '97110', name: 'Rotech', city: 'Columbus', state: 'IN', areaId: 'A6', regionId: 'R7' },
  { lawsonNumber: '95810', name: 'Rotech', city: 'Fort Wayne', state: 'IN', areaId: 'A6', regionId: 'R7' },
  { lawsonNumber: '95410', name: "Hook's Oxygen & Medical Equipment", city: 'Indianapolis', state: 'IN', areaId: 'A6', regionId: 'R7' },
  { lawsonNumber: '96210', name: "Hook's Oxygen & Medical Equipment", city: 'Indianapolis', state: 'IN', areaId: 'A6', regionId: 'R7' },
  { lawsonNumber: '96510', name: 'Rotech', city: 'Kokomo', state: 'IN', areaId: 'A6', regionId: 'R7' },
  { lawsonNumber: '96810', name: "Hook's Oxygen & Medical Equipment", city: 'Lafayette', state: 'IN', areaId: 'A6', regionId: 'R7' },
  { lawsonNumber: '96310', name: "Hook's Oxygen & Medical Equipment", city: 'Merrillville', state: 'IN', areaId: 'A6', regionId: 'R7' },
  { lawsonNumber: '96110', name: "Hook's Oxygen & Medical Equipment", city: 'Mishawaka', state: 'IN', areaId: 'A6', regionId: 'R7' },
  { lawsonNumber: '96910', name: "Hook's Oxygen & Medical Equipment", city: 'Yorktown', state: 'IN', areaId: 'A6', regionId: 'R7' },

  // AREA 7 - Jeffrey 'Jeff' Trotman
  { lawsonNumber: '144110', name: 'Rotech', city: 'Apple Valley', state: 'MN', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '29910', name: 'Rotech of Aurora', city: 'Aurora', state: 'IL', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '122210', name: 'Specialty Home Med', city: 'Baxter', state: 'MN', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '63710', name: 'Rotech', city: 'Charles City', state: 'IA', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '64810', name: 'Rotech', city: 'Dubuque', state: 'IA', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '119210', name: 'Rotech', city: 'Duluth', state: 'MN', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '110810', name: 'Rotech of Elmhurst', city: 'Elmhurst', state: 'IL', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '63910', name: 'Rotech', city: 'Fort Dodge', state: 'IA', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '64210', name: 'Rotech', city: 'Hiawatha', state: 'IA', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '104510', name: 'Medwest', city: 'Marshfield', state: 'WI', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '64110', name: 'Rotech', city: 'Marshalltown', state: 'IA', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '63210', name: 'Rotech', city: 'Moline', state: 'IL', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '64410', name: 'Rotech', city: 'Oelwein', state: 'IA', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '144810', name: 'Arrowhealth Medical Supply', city: 'Rochester', state: 'MN', areaId: 'A7', regionId: 'R7' },
  { lawsonNumber: '113410', name: 'Rotech', city: 'Storm Lake', state: 'IA', areaId: 'A7', regionId: 'R7' },

  // AREA 8 - Cornell Covington (VA Manager)
  { lawsonNumber: '99410', name: 'Rotech of Champaign', city: 'Champaign', state: 'IL', areaId: 'A8', regionId: 'R7' },
  { lawsonNumber: '110710', name: 'Rotech of Elmhurst', city: 'Elmhurst (VA only)', state: 'IL', areaId: 'A8', regionId: 'R7' },
  { lawsonNumber: '105710', name: 'Rotech', city: 'Tomah', state: 'WI', areaId: 'A8', regionId: 'R7' },
  { lawsonNumber: '105610', name: 'Rotech', city: 'Watertown (VA only)', state: 'WI', areaId: 'A8', regionId: 'R7' },
];

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

// All locations across every imported region
const ALL_LOCATIONS = [
  ...REGION_2_LOCATIONS,
  ...REGION_3_LOCATIONS,
  ...REGION_5_LOCATIONS,
  ...REGION_6_LOCATIONS,
  ...REGION_7_LOCATIONS,
  ...REGION_8_LOCATIONS,
];

// AREA MANAGERS
const AREA_MANAGERS = [
  // Region 2
  { areaId: 'A1', regionId: 'R2', name: 'Brenda Perry', email: 'brenda.perry@rotech.com', phone: '(443) 618-8714' },
  { areaId: 'A2', regionId: 'R2', name: 'Walter "Buddy" Volinski', email: 'walter.volinski@rotech.com', phone: '(919) 606-7121' },
  { areaId: 'A3', regionId: 'R2', name: 'Dawn Ragukas', email: 'dawn.ragukas@rotech.com', phone: '(570) 793-8053' },
  { areaId: 'A4', regionId: 'R2', name: 'Michael Belmont', email: 'michael.belmont@rotech.com', phone: '(860) 710-5255' },
  { areaId: 'A5', regionId: 'R2', name: 'Scott Thompson', email: 'scott.thompson@rotech.com', phone: '(513) 503-6561' },
  { areaId: 'A6', regionId: 'R2', name: 'Taylor "Lee" Harris', email: 'lharris@rotech.com', phone: '(330) 204-0265' },
  { areaId: 'A8', regionId: 'R2', name: 'Tom Fontaine', email: 'thomas.fontaine@rotech.com', phone: '(603) 370-7860' },

  // Region 3
  { areaId: 'A1', regionId: 'R3', name: 'Mindy Mills', email: 'mindy.mills@rotech.com', phone: '(251) 509-9711' },
  { areaId: 'A2', regionId: 'R3', name: 'Brandy Nalley', email: 'brandy.nalley@rotech.com', phone: '(502) 349-8510' },
  { areaId: 'A3', regionId: 'R3', name: 'Aleksandr Povarich', email: 'aleksandr.povarich@rotech.com', phone: '(839) 252-9100' },
  // Area 5 (AM) is currently OPEN per the roster - no manager contact to import.

  // Region 5
  { areaId: 'A1', regionId: 'R5', name: 'Mark Paul', email: 'mark.paul@rotech.com', phone: '(407) 304-0425' },
  { areaId: 'A2', regionId: 'R5', name: 'Shannon Hutson', email: 'shutson@rotech.com', phone: '(770) 548-6651' },
  { areaId: 'A3', regionId: 'R5', name: 'Wanda Kavades', email: 'wkavades@rotech.com', phone: '(386) 233-0864' },
  { areaId: 'A4', regionId: 'R5', name: 'Amber Fulghum', email: 'amber.fulghum@rotech.com', phone: '(229) 269-0026' },
  { areaId: 'A5', regionId: 'R5', name: 'Carla Ard', email: 'card@rotech.com', phone: '(251) 753-0353' },
  { areaId: 'A7', regionId: 'R5', name: 'Damon Melton', email: 'dmelton@rotech.com', phone: '(318) 752-2112' },

  // Region 6
  { areaId: 'A1', regionId: 'R6', name: 'Jeffrey Ford', email: 'jeffrey.ford@rotech.com', phone: '(210) 643-7893' },
  { areaId: 'A2', regionId: 'R6', name: 'Debbie Stroud', email: 'debbie.stroud@rotech.com', phone: '(702) 277-5452' },
  { areaId: 'A3', regionId: 'R6', name: 'Mike Herrera', email: 'michael.herrera@rotech.com', phone: '(915) 433-9005' },
  { areaId: 'A4', regionId: 'R6', name: 'Matt Bailey', email: 'matthew.bailey@rotech.com', phone: '(806) 664-1226' },
  { areaId: 'A5', regionId: 'R6', name: 'Stephanie McEuen', email: 'stephanie.mceuen@rotech.com', phone: '(832) 544-5315' },
  { areaId: 'A9', regionId: 'R6', name: 'Wendy Oxner', email: 'wendy.oxner@rotech.com', phone: '(817) 703-3318' },

  // Region 7
  { areaId: 'A1', regionId: 'R7', name: "John 'David' Webb", email: 'john.webb@rotech.com', phone: '(405) 824-8366' },
  { areaId: 'A2', regionId: 'R7', name: 'Bryan Wink', email: 'bryan.wink@rotech.com', phone: '(913) 530-2225' },
  { areaId: 'A3', regionId: 'R7', name: 'Rebecca Green', email: 'rebecca.green@rotech.com', phone: '(901) 493-9534' },
  { areaId: 'A4', regionId: 'R7', name: 'Michele Smith', email: 'michele.smith@rotech.com', phone: '(573) 820-3686' },
  { areaId: 'A5', regionId: 'R7', name: 'Jaimie Forsberg', email: 'jaimie.forsberg@rotech.com', phone: '(313) 457-7412' },
  { areaId: 'A6', regionId: 'R7', name: "M 'Alex' Van Zant", email: 'maurice.vanzant@rotech.com', phone: '(317) 416-9000' },
  { areaId: 'A7', regionId: 'R7', name: "Jeffrey 'Jeff' Trotman", email: 'jeffrey.trotman@rotech.com', phone: '(507) 951-0753' },
  { areaId: 'A8', regionId: 'R7', name: 'Cornell Covington (VA Manager)', email: 'cornell.covington@rotech.com', phone: '(847) 812-1000' },

  // Region 8
  { areaId: 'A2', regionId: 'R8', name: 'Cassidy Williams', email: 'cassidy.williams@rotech.com', phone: '(425) 350-0107' },
  { areaId: 'A3', regionId: 'R8', name: 'Lisa Durgain', email: 'lisa.durgain@rotech.com', phone: '(970) 231-9549' },
  { areaId: 'A4', regionId: 'R8', name: 'Brian Duffell', email: 'brian.duffell@rotech.com', phone: '(602) 214-6695' },
  { areaId: 'A6', regionId: 'R8', name: 'Kristi Kellogg', email: 'kristi.kellogg@rotech.com', phone: '(303) 881-4727' },
  { areaId: 'A7', regionId: 'R8', name: 'Joetta Bryant', email: 'joetta.bryant@rotech.com', phone: '(719) 251-1685' },
];

// REGION INFO
const REGIONS = [
  { regionId: 'R2', name: 'Region 2', directorName: 'Julie Findley', directorEmail: 'julie.findley@rotech.com' },
  { regionId: 'R3', name: 'Region 3', directorName: "Donald 'Trey' Moore", directorEmail: 'donald.moore@rotech.com' },
  { regionId: 'R5', name: 'Region 5', directorName: 'Katherine Jones', directorEmail: 'katherine.jones@rotech.com' },
  { regionId: 'R6', name: 'Region 6', directorName: 'Amber Bunch', directorEmail: 'abunch@rotech.com' },
  { regionId: 'R7', name: 'Region 7', directorName: "Kimberly 'Kim' Martin", directorEmail: 'kimberly.martin@rotech.com' },
  { regionId: 'R8', name: 'Region 8', directorName: 'Josh Connell', directorEmail: 'jconnell@rotech.com' },
];

// =====================================================
// IMPORT FUNCTIONS
// =====================================================

export async function importLocations() {
  console.log('Starting location import...');
  const batch = writeBatch(db);
  let count = 0;

  for (const location of ALL_LOCATIONS) {
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
