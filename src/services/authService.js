import { auth, googleProvider, db } from '../firebase/config';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export const authService = {
  // Google Sign-In with Multi-Role Checking
  async loginWithGoogle() {
    console.log("🔐 Starting Google Popup Authentication...");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log("✅ Google Auth Successful for Email:", user.email);

      const emailLower = user.email.toLowerCase();

      // 🔍 1. आधी 'users' कलेक्शनमध्ये चेक करा (Admin / Super Admin)
      console.log("🔍 Checking 'users' collection for:", emailLower);
      const userDocRef = doc(db, "users", emailLower);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("📄 User Data from 'users' Firestore:", userData);

                // 💡 `isActive === false` किंवा `status === "Inactive"` असेल तरच ब्लॉक करा
const isUserActive = userData.isActive !== false && userData.status !== "Inactive";

        // if (userData.status !== "Active") {
        //   console.error("❌ Account is Inactive!");
        //   await signOut(auth);
        //   throw new Error("ACCOUNT_INACTIVE");
        // }

        if (!isUserActive) {
  console.error("❌ Account is Inactive!");
  await signOut(auth);
  throw new Error("ACCOUNT_INACTIVE");
}





        console.log(`🎉 Admin Access Granted! Role: [${userData.role}]`);
        return {
          ...user,
          role: userData.role || "Super Admin"
        };
      }

      // 🏆 2. जर 'users' मध्ये नसेल तर सुरक्षितपणे 'teams' चेक करा
      try {
        console.log("🔍 Checking 'teams' collection for:", emailLower);
        const q = query(collection(db, "teams"), where("email", "==", emailLower));
        const teamSnap = await getDocs(q);

        if (!teamSnap.empty) {
          console.log(`🎉 Team Access Granted! Found team user.`);
          return {
            ...user,
            role: "Team"
          };
        }
      } catch (teamErr) {
        console.warn("⚠️ Could not query 'teams' collection (Rules Restriction):", teamErr.message);
      }

      // 🛑 3. दोन्हीकडे नसेल तर
      console.error("❌ Access Denied: User email not found!");
      await signOut(auth);
      throw new Error("UNAUTHORIZED_EMAIL");

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

  // Get User Role Helper (Safe Version)
  // async getUserRole(email) {
  //   try {
  //     if (!email) return null;
  //     const emailLower = email.toLowerCase();
      
  //     // 1. Check in 'users' collection
  //     const userDocRef = doc(db, "users", emailLower);
  //     const userDoc = await getDoc(userDocRef);
      
  //     if (userDoc.exists()) {
  //       return userDoc.data();
  //     }

  //     // 2. Check in 'teams' collection safely
  //     try {
  //       const q = query(collection(db, "teams"), where("email", "==", emailLower));
  //       const teamSnap = await getDocs(q);
        
  //       if (!teamSnap.empty) {
  //         return { role: 'Team' };
  //       }
  //     } catch (e) {
  //       console.warn("⚠️ Team Query Warning:", e.message);
  //     }

  //     return null;
  //   } catch (error) {
  //     console.error("Error fetching user role:", error);
  //     return null;
  //   }
  // }

  // 🟢 authService.js मधील getUserRole पद्धत:
async getUserRole(email) {
  try {
    if (!email) return null;
    const emailLower = email.toLowerCase();
    
    // 1. Check in 'users' collection
    const userDocRef = doc(db, "users", emailLower);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        ...data,
        role: data.role || "Reviewer",
        department: data.department || "MRDGA", // Default Department
        // 👑 Super Admin चेकिंग सोपे करण्यासाठी कॉम्बिनेशन फ्लॅग:
        isSuperAdmin: (data.department === "SUPER" || data.role === "Super Admin") && (data.isActive !== false && data.status !== "Inactive")
      };
    }

    // 2. Check in 'teams' collection safely
    try {
      const q = query(collection(db, "teams"), where("email", "==", emailLower));
      const teamSnap = await getDocs(q);
      
      if (!teamSnap.empty) {
        return { role: 'Team', department: 'Public' };
      }
    } catch (e) {
      console.warn("⚠️ Team Query Warning:", e.message);
    }

    return null;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}

};