// Load environment variables from .env.local BEFORE importing Firebase
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import * as admin from "firebase-admin";
import { existsSync } from "fs";
import { resolve } from "path";

// Initialize Firebase Admin SDK
let auth: admin.auth.Auth;
let db: admin.firestore.Firestore;

try {
  if (!admin.apps.length) {
    // Try to use service account key file if it exists
    const serviceAccountPath = resolve(process.cwd(), "serviceAccountKey.json");
    
    if (existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use credentials from environment variable
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      // Try with just project ID (may work if using Application Default Credentials)
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  }
  
  auth = admin.auth();
  db = admin.firestore();
} catch (error: any) {
  if (error.code === 'app/invalid-credential') {
    console.error("❌ Firebase Admin SDK requires credentials.");
    console.error("\n📝 To fix this, you have two options:\n");
    console.error("Option 1: Download service account key");
    console.error("  1. Go to Firebase Console → Project Settings → Service Accounts");
    console.error("  2. Click 'Generate new private key'");
    console.error("  3. Save the file as 'serviceAccountKey.json' in the project root");
    console.error("  4. Run this script again\n");
    console.error("Option 2: Use Application Default Credentials");
    console.error("  1. Install Google Cloud SDK");
    console.error("  2. Run: gcloud auth application-default login");
    console.error("  3. Run this script again\n");
    process.exit(1);
  }
  throw error;
}

async function resetAdmin(email?: string, password?: string) {
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

    console.log("🗑️  Deleting all existing users...\n");

    // List all users
    let deletedCount = 0;
    let nextPageToken: string | undefined;

    try {
      do {
        const listUsersResult = await auth.listUsers(1000, nextPageToken);
      
      // Delete users in batches
      const deletePromises = listUsersResult.users.map(async (userRecord) => {
        try {
          await auth.deleteUser(userRecord.uid);
          console.log(`  ✓ Deleted user: ${userRecord.email || userRecord.uid}`);
          deletedCount++;
        } catch (error: any) {
          console.error(`  ✗ Failed to delete user ${userRecord.uid}: ${error.message}`);
        }
      });

        await Promise.all(deletePromises);
        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);

      console.log(`\n✅ Deleted ${deletedCount} user(s) from Firebase Authentication\n`);
    } catch (authError: any) {
      if (authError.code === 'app/invalid-credential' || authError.message?.includes('credential')) {
        console.error("❌ Firebase Admin SDK requires credentials to delete users.");
        console.error("\n📝 To fix this, you need to download a service account key:");
        console.error("  1. Go to Firebase Console → Project Settings → Service Accounts");
        console.error("  2. Click 'Generate new private key'");
        console.error("  3. Save the file as 'serviceAccountKey.json' in the project root");
        console.error("  4. Run this script again\n");
        console.error("⚠️  Skipping user deletion. Continuing with Firestore cleanup and new user creation...\n");
      } else {
        throw authError;
      }
    }

    // Delete all user documents from Firestore
    console.log("🗑️  Deleting all user documents from Firestore...\n");
    const usersSnapshot = await db.collection("users").get();
    let firestoreDeletedCount = 0;

    const deletePromises = usersSnapshot.docs.map(async (doc) => {
      try {
        await doc.ref.delete();
        console.log(`  ✓ Deleted Firestore document: ${doc.id}`);
        firestoreDeletedCount++;
      } catch (error: any) {
        console.error(`  ✗ Failed to delete document ${doc.id}: ${error.message}`);
      }
    });

    await Promise.all(deletePromises);
    console.log(`\n✅ Deleted ${firestoreDeletedCount} document(s) from Firestore\n`);

    // Create new admin user
    console.log("🚀 Creating new admin user...\n");
    console.log(`📝 Creating user with email: ${adminEmail}`);

    const userRecord = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
    });

    console.log(`  ✓ User created successfully (UID: ${userRecord.uid})\n`);

    // Create user document in Firestore with admin role (Admin SDK bypasses security rules)
    console.log(`📝 Creating user document in Firestore...`);
    await db.collection("users").doc(userRecord.uid).set({
      role: "admin",
      email: adminEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  ✓ User document created with admin role\n`);

    console.log("✅ Admin reset completed successfully!");
    console.log("\n📋 New Admin Login Credentials:");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log("\n⚠️  Please change the password after first login!");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error resetting admin:", error);
    
    if (error.code === "auth/email-already-in-use") {
      console.error("\n⚠️  User with this email already exists (this shouldn't happen after deletion).");
    }
    
    process.exit(1);
  }
}

// Run the script when executed directly
resetAdmin().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
