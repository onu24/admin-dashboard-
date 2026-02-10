// Load environment variables from .env.local BEFORE importing Firebase
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

async function testAdminLogin(email?: string, password?: string) {
  try {
    const adminEmail = email || process.argv[2] || "newadmin@example.com";
    const adminPassword = password || process.argv[3] || "Admin@123456";

    console.log("🧪 Testing Admin Login...\n");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword.replace(/./g, "*")}\n`);

    // Dynamically import Firebase after env vars are loaded
    const { getApps, initializeApp } = await import("firebase/app");
    const { getFirestore, doc, getDoc } = await import("firebase/firestore");
    const { signInWithEmailAndPassword, signOut, getAuth } = await import("firebase/auth");

    // Initialize Firebase
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
    const db = getFirestore(app);
    const auth = getAuth(app);

    // Step 1: Test Firebase Auth login
    console.log("📝 Step 1: Testing Firebase Authentication...");
    let user;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      user = userCredential.user;
      console.log(`  ✅ Authentication successful!`);
      console.log(`     UID: ${user.uid}`);
      console.log(`     Email: ${user.email}\n`);
    } catch (authError: any) {
      console.error(`  ❌ Authentication failed: ${authError.message}`);
      if (authError.code === "auth/user-not-found") {
        console.error(`     User does not exist in Firebase Authentication.`);
      } else if (authError.code === "auth/wrong-password") {
        console.error(`     Incorrect password.`);
      } else if (authError.code === "auth/invalid-email") {
        console.error(`     Invalid email format.`);
      }
      process.exit(1);
    }

    // Step 2: Check Firestore document
    console.log("📝 Step 2: Checking Firestore user document...");
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (!userDoc.exists()) {
        console.error(`  ❌ User document does NOT exist in Firestore!`);
        console.error(`     Document path: users/${user.uid}`);
        console.error(`\n  📋 To fix this, create the document in Firebase Console:`);
        console.error(`     1. Go to Firebase Console → Firestore Database`);
        console.error(`     2. Navigate to 'users' collection`);
        console.error(`     3. Create document with ID: ${user.uid}`);
        console.error(`     4. Add fields:`);
        console.error(`        - role: "admin" (string)`);
        console.error(`        - email: "${adminEmail}" (string)`);
        console.error(`        - createdAt: <timestamp>`);
        await signOut(auth);
        process.exit(1);
      }

      const userData = userDoc.data();
      console.log(`  ✅ User document exists!`);
      console.log(`     Document data:`, JSON.stringify(userData, null, 2));

      // Step 3: Check admin role
      console.log(`\n📝 Step 3: Checking admin role...`);
      if (userData.role !== "admin") {
        console.error(`  ❌ User does NOT have admin role!`);
        console.error(`     Current role: ${userData.role || "undefined"}`);
        console.error(`     Required role: "admin"`);
        console.error(`\n  📋 To fix this, update the document in Firebase Console:`);
        console.error(`     1. Go to Firebase Console → Firestore Database`);
        console.error(`     2. Navigate to 'users' collection`);
        console.error(`     3. Open document: ${user.uid}`);
        console.error(`     4. Update 'role' field to: "admin"`);
        await signOut(auth);
        process.exit(1);
      }

      console.log(`  ✅ User has admin role!`);
      console.log(`\n✅ All checks passed! Login should work successfully.`);
      console.log(`\n📋 Summary:`);
      console.log(`   ✅ Firebase Authentication: Working`);
      console.log(`   ✅ Firestore Document: Exists`);
      console.log(`   ✅ Admin Role: Verified`);
      console.log(`\n🚀 You can now log in with:`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword.replace(/./g, "*")}`);

      await signOut(auth);
      process.exit(0);
    } catch (firestoreError: any) {
      console.error(`  ❌ Error checking Firestore: ${firestoreError.message}`);
      if (firestoreError.code === 'permission-denied') {
        console.error(`     Permission denied. Check Firestore security rules.`);
      }
      await signOut(auth);
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

// Run the script when executed directly
testAdminLogin().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
