// Simple Node.js script to create admin
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const adminEmail = 'admin@admin.com';
const adminPassword = 'Admin@123456';

console.log('🔧 Creating Admin User...\n');

createUserWithEmailAndPassword(auth, adminEmail, adminPassword)
    .then((userCredential) => {
        const user = userCredential.user;
        console.log('✅ Firebase Auth user created!');
        console.log(`   UID: ${user.uid}\n`);

        // Create Firestore document
        return setDoc(doc(db, 'users', user.uid), {
            role: 'admin',
            email: adminEmail,
            createdAt: new Date(),
        }).then(() => {
            console.log('✅ Firestore document created!\n');
            console.log('📋 Login Credentials:');
            console.log(`   Email: ${adminEmail}`);
            console.log(`   Password: ${adminPassword}`);
            console.log(`   UID: ${user.uid}\n`);
            process.exit(0);
        });
    })
    .catch((error) => {
        if (error.code === 'auth/email-already-in-use') {
            console.log('⚠️  User already exists!');
            console.log('\n📋 Use these credentials to login:');
            console.log(`   Email: ${adminEmail}`);
            console.log(`   Password: ${adminPassword}\n`);
            console.log('💡 If password is wrong, delete user from Firebase Console and run again.\n');
        } else {
            console.error('❌ Error:', error.message);
        }
        process.exit(error.code === 'auth/email-already-in-use' ? 0 : 1);
    });
