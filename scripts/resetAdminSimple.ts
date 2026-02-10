// Load environment variables from .env.local BEFORE importing Firebase
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

async function resetAdminSimple(email?: string, password?: string) {
  try {
    // Get email and password from command line arguments or use defaults
    const adminEmail = email || process.argv[2] || "admin@admin.com";
    const adminPassword = password || process.argv[3] || "Admin@123456";

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      console.error("❌ Invalid email format. Please provide a valid email address.");
      process.exit(1);
    }

    // Validate password length (Firebase requires at least 6 characters)
    if (adminPassword.length < 6) {
      console.error("❌ Password must be at least 6 characters long.");
      process.exit(1);
    }

    console.log("⚠️  NOTE: This script uses the client SDK and has limitations:");
    console.log("   - Cannot delete Firebase Auth users (requires Admin SDK)");
    console.log("   - Can delete Firestore documents (if you have admin access)");
    console.log("   - Can create new admin user\n");

    // Dynamically import Firebase after env vars are loaded
    const { getApps, initializeApp } = await import("firebase/app");
    const { getFirestore, collection, getDocs, doc, deleteDoc } = await import("firebase/firestore");
    const { createUserWithEmailAndPassword } = await import("firebase/auth");
    const { getAuth } = await import("firebase/auth");

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

    // Delete all user documents from Firestore
    console.log("🗑️  Attempting to delete all user documents from Firestore...\n");
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      let firestoreDeletedCount = 0;

      const deletePromises = usersSnapshot.docs.map(async (docSnapshot) => {
        try {
          await deleteDoc(doc(db, "users", docSnapshot.id));
          console.log(`  ✓ Deleted Firestore document: ${docSnapshot.id}`);
          firestoreDeletedCount++;
        } catch (error: any) {
          console.error(`  ✗ Failed to delete document ${docSnapshot.id}: ${error.message}`);
        }
      });

      await Promise.all(deletePromises);
      console.log(`\n✅ Deleted ${firestoreDeletedCount} document(s) from Firestore\n`);
    } catch (error: any) {
      console.error(`  ⚠️  Could not delete Firestore documents: ${error.message}`);
      console.error(`  This may be due to security rules. You may need to delete them manually.\n`);
    }

    // Create new admin user
    console.log("🚀 Creating new admin user...\n");
    console.log(`📝 Creating user with email: ${adminEmail}`);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        adminEmail,
        adminPassword
      );
      const user = userCredential.user;
      console.log(`  ✓ User created successfully (UID: ${user.uid})\n`);

      // Try to create user document in Firestore (may fail due to security rules)
      console.log(`📝 Attempting to create user document in Firestore...`);
      const { setDoc } = await import("firebase/firestore");
      try {
        await setDoc(doc(db, "users", user.uid), {
          role: "admin",
          email: adminEmail,
          createdAt: new Date(),
        });
        console.log(`  ✓ User document created with admin role\n`);
      } catch (firestoreError: any) {
        if (firestoreError.code === 'permission-denied') {
          console.log(`  ⚠️  Could not create Firestore document due to security rules.`);
          console.log(`  ⚠️  You'll need to manually create the document in Firestore:`);
          console.log(`      Collection: users`);
          console.log(`      Document ID: ${user.uid}`);
          console.log(`      Data: { role: "admin", email: "${adminEmail}", createdAt: <timestamp> }`);
          console.log(`  ⚠️  Or use Firebase Admin SDK to bypass security rules.\n`);
        } else {
          throw firestoreError;
        }
      }

      console.log("✅ Admin user created successfully!");
      console.log("\n📋 New Admin Login Credentials:");
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   UID: ${user.uid}`);
      console.log("\n⚠️  IMPORTANT:");
      console.log("   1. Delete old users manually from Firebase Console → Authentication");
      console.log("   2. If Firestore document creation failed, create it manually as shown above");
      console.log("   3. Please change the password after first login!");

      process.exit(0);
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        console.error("\n⚠️  User with this email already exists.");
        console.error("   You need to delete it first from Firebase Console → Authentication");
        console.error("   Or use the full reset script with Admin SDK credentials.");
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error("❌ Error resetting admin:", error);
    process.exit(1);
  }
}

// Run the script when executed directly
resetAdminSimple().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
