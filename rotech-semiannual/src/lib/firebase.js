import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAwd5roTMV4YH64ZL6mRFTFWARa0fG7wK8",
  authDomain: "rotech-location-readiness.firebaseapp.com",
  projectId: "rotech-location-readiness",
  storageBucket: "rotech-location-readiness.firebasestorage.app",
  messagingSenderId: "766919297546",
  appId: "1:766919297546:web:f68bbc1cbfff383e3e2df3",
  measurementId: "G-51PDEDV06S"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
