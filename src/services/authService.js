import { auth, googleProvider, db } from '../firebase/config';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const authService = {
  // Google Sign-In with Strict Role Checking
  async loginWithGoogle() {
    console.log("🔐 Starting Google Popup Authentication...");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log("✅ Google Auth Successful for Email:", user.email);

      // 🔍 Firestore मधील 'users' कलेक्शनमध्ये रोल तपासणे
      const emailLower = user.email.toLowerCase();
      console.log("🔍 Checking 'users' collection in Firestore for:", emailLower);

      const userDocRef = doc(db, "users", emailLower);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.error("❌ Access Denied: User email not found in Firestore 'users' collection!");
        await signOut(auth);
        throw new Error("UNAUTHORIZED_EMAIL");
      }

      const userData = userDoc.data();
      console.log("📄 User Data from Firestore:", userData);

      if (userData.status !== "Active") {
        console.error("❌ Account is Inactive!");
        await signOut(auth);
        throw new Error("ACCOUNT_INACTIVE");
      }

      console.log(`🎉 Access Granted! Role: [${userData.role}]`);
      return {
        ...user,
        role: userData.role
      };
    } catch (error) {
      console.error("❌ Auth Error:", error.message || error);
      throw error;
    }
  },

  // Logout
  async logout() {
    console.log("🚪 Logging out user...");
    try {
      await signOut(auth);
      console.log("✅ Logout successful.");
    } catch (error) {
      console.error("❌ Logout Error:", error);
    }
  },

  getCurrentUser(callback) {
    return onAuthStateChanged(auth, callback);
  },
  // src/services/authService.js

async getUserRole(email) {
  try {
    if (!email) return null;
    // 💡 ईमेल स्मॉल लेटर्समध्ये असावा
    const userDocRef = doc(db, "users", email.toLowerCase());
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data(); // { role: 'Admin', ... }
    }
    return null;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}
};