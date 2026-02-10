// Quick Admin Setup Script
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

async function quickAdminSetup() {
    const adminEmail = "admin@admin.com";
    const adminPassword = "Admin@123456";

    console.log("🔧 Quick Admin Setup");
    console.log("==================\n");

    try {
        // Import Firebase modules
        const { initializeApp, getApps } = await import("firebase/app");
        const { getAuth, createUserWithEmailAndPassword } = await import("firebase/auth");
        const { getFirestore, doc, setDoc } = await import("firebase/firestore");

        // Initialize Firebase
        const firebaseConfig = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };

        const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        // Step 1: Create Firebase Auth User
        console.log("📝 Step 1: Creating Firebase Authentication user...");
        let userCredential;
        try {
            userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            console.log(`✅ User created successfully!`);
            console.log(`   UID: ${userCredential.user.uid}\n`);
        } catch (authError: any) {
            if (authError.code === "auth/email-already-in-use") {
                console.log("⚠️  User already exists in Firebase Auth");
                console.log("   You can use these credentials to login:\n");
                console.log("📋 Login Credentials:");
                console.log(`   Email: ${adminEmail}`);
                console.log(`   Password: ${adminPassword}\n`);
                console.log("💡 If you forgot the password, delete the user from Firebase Console");
                console.log("   and run this script again.\n");
                process.exit(0);
            }
            throw authError;
        }

        // Step 2: Create Firestore Document
        console.log("📝 Step 2: Creating Firestore user document...");
        try {
            await setDoc(doc(db, "users", userCredential.user.uid), {
                role: "admin",
                email: adminEmail,
                createdAt: new Date(),
            });
            console.log("✅ Firestore document created with admin role!\n");
        } catch (firestoreError: any) {
            console.log("⚠️  Firestore document creation failed");
            console.log(`   Error: ${firestoreError.message}\n`);
            console.log("📝 Manual Steps Required:");
            console.log("   1. Go to Firebase Console → Firestore Database");
            console.log("   2. Create a new document:");
            console.log(`      Collection: users`);
            console.log(`      Document ID: ${userCredential.user.uid}`);
            console.log(`      Fields:`);
            console.log(`        - role: "admin" (string)`);
            console.log(`        - email: "${adminEmail}" (string)`);
            console.log(`        - createdAt: (timestamp)\n`);
        }

        // Success!
        console.log("✅ Setup Complete!\n");
        console.log("📋 Your Admin Login Credentials:");
        console.log("================================");
        console.log(`Email:    ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        console.log(`UID:      ${userCredential.user.uid}`);
        console.log("================================\n");
        console.log("🔐 You can now login to your admin dashboard!");
        console.log("⚠️  Remember to change your password after first login.\n");

        process.exit(0);
    } catch (error: any) {
        console.error("\n❌ Error:", error.message);
        console.error("\nFull error:", error);
        process.exit(1);
    }
}

quickAdminSetup();
