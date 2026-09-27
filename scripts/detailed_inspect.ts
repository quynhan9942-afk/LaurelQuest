import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const dbId = config.firestoreDatabaseId || config.databaseId || 'ai-studio-laurelquest-83903549-030f-482a-8f71-523ffd7c4c9e';
const db = getFirestore(app, dbId);

async function inspectDetailed() {
  const classRef = doc(db, 'classes', 'thcs_nguyenvancu_6a3');
  const snap = await getDoc(classRef);
  if (!snap.exists()) {
    console.log('Doc not found');
    process.exit(1);
  }

  const data = snap.data();
  console.log('Document Keys:', Object.keys(data));
  
  // Inspect students
  const students = data.students || [];
  console.log(`\n--- HỌC SINH (${students.length}) ---`);
  if (students.length > 0) {
    console.log('Học sinh [0]:', JSON.stringify(students[0], null, 2));
  }

  // Inspect pointLogs
  const pointLogs = data.pointLogs || [];
  console.log(`\n--- POINT LOGS (${pointLogs.length}) ---`);
  if (pointLogs.length > 0) {
    console.log('PointLog [0]:', JSON.stringify(pointLogs[0], null, 2));
    console.log('PointLog [last]:', JSON.stringify(pointLogs[pointLogs.length - 1], null, 2));
  }

  // Check all fields
  for (const key of Object.keys(data)) {
    if (key !== 'students' && key !== 'pointLogs') {
      console.log(`\nField "${key}":`, typeof data[key], Array.isArray(data[key]) ? `Array(${data[key].length})` : data[key]);
      if (Array.isArray(data[key]) && data[key].length > 0) {
        console.log(`  Sample item:`, JSON.stringify(data[key][0], null, 2));
      }
    }
  }

  process.exit(0);
}

inspectDetailed().catch(console.error);
