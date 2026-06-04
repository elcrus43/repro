import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./scripts/firebase-service-account.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

async function listUsers() {
  console.log('--- Firebase Auth Users ---');
  const userList = await auth.listUsers();
  for (const u of userList.users) {
    const docSnap = await db.collection('profiles').doc(u.uid).get();
    const profile = docSnap.exists ? docSnap.data() : null;
    console.log(`Email: ${u.email} | UID: ${u.uid} | Name: ${u.displayName}`);
    console.log(`  Firestore Profile:`, profile);
  }
}

listUsers().catch(console.error);
