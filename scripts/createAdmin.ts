// Load environment variables from .env.local BEFORE importing Firebase
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

async function createAdmin() {
  try {
    const email = "admin@example.com";
    const password = "admin123456";

    console.log("🚀 Creating admin user...\n");

    // Create user in Firebase Authentication
    console.log(`📝 Creating user with email: ${email}`);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    console.log(`  ✓ User created successfully (UID: ${user.uid})\n`);

    // Create user document in Firestore with admin role
    console.log(`📝 Creating user document in Firestore...`);
    await setDoc(doc(db, "users", user.uid), {
      role: "admin",
      email: email,
      createdAt: new Date(),
    });
    console.log(`  ✓ User document created with admin role\n`);

    console.log("✅ Admin user created successfully!");
    console.log("\n📋 Login Credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log("\n⚠️  Please change the password after first login!");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error creating admin user:", error);
    
    if (error.code === "auth/email-already-in-use") {
      console.error("\n⚠️  User with this email already exists.");
      console.error("   If you want to update the role, you can manually:");
      console.error("   1. Get the user UID from Firebase Console");
      console.error("   2. Create/update document at users/{uid} with role: 'admin'");
    }
    
    process.exit(1);
  }
}

// Run the script when executed directly
createAdmin().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
