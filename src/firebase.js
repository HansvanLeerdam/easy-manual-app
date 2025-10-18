import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCMi13Ci2AXdtVePTMIK1oJLrT61aTyHp0",
  authDomain: "easy-manual-app.firebaseapp.com",
  projectId: "easy-manual-app",
  storageBucket: "easy-manual-app.appspot.com",
  messagingSenderId: "255572942841",
  appId: "1:255572942841:web:5a705fd1d559a13b82a728"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
