import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAJuUj5VhdvSGA03XOkNY82cDcrfWuzUTc",
  authDomain: "eco-pizzaria.firebaseapp.com",
  databaseURL: "https://eco-pizzaria-default-rtdb.firebaseio.com",
  projectId: "eco-pizzaria",
  storageBucket: "eco-pizzaria.firebasestorage.app",
  messagingSenderId: "260630203096",
  appId: "1:260630203096:web:7e2a549900310fcf6525ad"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export default app;
