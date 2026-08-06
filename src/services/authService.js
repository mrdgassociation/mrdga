import { auth, googleProvider, db } from '../firebase/config';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { notificationService } from './notificationService'; // 🔔 Step 1: Notification Trigger जोडले

export const authService = {
  // 🔑 Google Sign-In with Multi-Role Checking (Users -> Teams -> Insurance)
  async loginWithGoogle() {
    console.log("🔐 Starting Google Popup Authentication...");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log("✅ Google Auth Successful for Email:", user.email);

      const emailLower = user.email.toLowerCase();

      // 🔍 १. आधी 'users' कलेक्शनमध्ये चेक करा (Staff / Admin)
      console.log("🔍 Checking 'users' collection for:", emailLower);
      const userDocRef = doc(db, "users", emailLower);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("📄 User Data from 'users' Firestore:", userData);

        // 💡 `isActive === false` किंवा `status === "Inactive"` असेल तर ब्लॉक करा
        const isUserActive = userData.isActive !== false && userData.status !== "Inactive";

        if (!isUserActive) {
          console.error("❌ Account is Inactive!");
          await signOut(auth);
          throw new Error("ACCOUNT_INACTIVE");
        }

        console.log(`🎉 Staff/Admin Access Granted! Role: [${userData.role}]`);

        // 📲 🎯 Step 1 Trigger: लॉगिन यशस्वी झाल्यामुळे टोकन मिळवून सेव्ह करा
        try {
          notificationService.requestPushPermission(emailLower);
        } catch (pushErr) {
          console.warn("⚠️ Push Permission trigger warning on login:", pushErr);
        }

        return {
          ...user,
          role: userData.role || "Reviewer",
          department: userData.department || "MRDGA"
        };
      }

      // 🏆 २. जर Staff नसेल, तर 'teams' (स्पर्धा फॉर्म) चेक करा
      try {
        console.log("🔍 Checking 'teams' collection for:", emailLower);
        const qTeams = query(collection(db, "teams"), where("email", "==", emailLower));
        const teamSnap = await getDocs(qTeams);

        if (!teamSnap.empty) {
          console.log(`🎉 Team Access Granted! Found competition user.`);

          // 📲 🎯 Step 1 Trigger: स्पर्धा युझरसाठी टोकन सेव्ह करा
          try {
            notificationService.requestPushPermission(emailLower);
          } catch (pushErr) {
            console.warn("⚠️ Push Permission trigger warning on login:", pushErr);
          }

          return {
            ...user,
            role: "Team",
            department: "Public"
          };
        }
      } catch (teamErr) {
        console.warn("⚠️ Could not query 'teams' collection:", teamErr.message);
      }

      // 🛡️ ३. जर 'teams' मध्ये नसेल, तर 'insurance_requests_2026' (विमा फॉर्म) चेक करा
      try {
        console.log("🔍 Checking 'insurance_requests_2026' collection for:", emailLower);
        const qInsurance = query(collection(db, "insurance_requests_2026"), where("email", "==", emailLower));
        const insuranceSnap = await getDocs(qInsurance);

        if (!insuranceSnap.empty) {
          console.log(`🎉 Insurance User Access Granted! Found insurance request.`);

          // 📲 🎯 Step 1 Trigger: विमा युझरसाठी टोकन सेव्ह करा
          try {
            notificationService.requestPushPermission(emailLower);
          } catch (pushErr) {
            console.warn("⚠️ Push Permission trigger warning on login:", pushErr);
          }

          return {
            ...user,
            role: "Team",
            department: "Public"
          };
        }
      } catch (insErr) {
        console.warn("⚠️ Could not query 'insurance_requests_2026' collection:", insErr.message);
      }

      // 🛑 ४. कुठेही डेटा सापडला नाही तरच Access Denied करा
      console.error("❌ Access Denied: User email not found in any collection!");
      await signOut(auth);
      throw new Error("UNAUTHORIZED_EMAIL");

    } catch (error) {
      console.error("❌ Auth Error:", error.message || error);
      throw error;
    }
  },

  // 🚪 Logout
  async logout() {
    console.log("🚪 Logging out user...");
    try {
      await signOut(auth);
      console.log("✅ Logout successful.");
    } catch (error) {
      console.error("❌ Logout Error:", error);
    }
  },

  // 🔄 Current Auth State Observer
  getCurrentUser(callback) {
    return onAuthStateChanged(auth, callback);
  },

  // 🟢 Get User Role & Department Helper
  async getUserRole(email) {
    try {
      if (!email) return null;
      const emailLower = email.toLowerCase();
      
      // 1. Check in 'users' collection (Admin/Staff)
      const userDocRef = doc(db, "users", emailLower);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          ...data,
          role: data.role || "Reviewer",
          department: data.department || "MRDGA",
          isSuperAdmin: (data.department === "SUPER" || data.role === "Super Admin") && (data.isActive !== false && data.status !== "Inactive")
        };
      }

      // 2. Check in 'teams' collection (Competition User)
      try {
        const qTeams = query(collection(db, "teams"), where("email", "==", emailLower));
        const teamSnap = await getDocs(qTeams);
        
        if (!teamSnap.empty) {
          return { role: 'Team', department: 'Public' };
        }
      } catch (e) {
        console.warn("⚠️ Team Query Warning:", e.message);
      }

      // 3. Check in 'insurance_requests_2026' collection (Insurance User)
      try {
        const qInsurance = query(collection(db, "insurance_requests_2026"), where("email", "==", emailLower));
        const insuranceSnap = await getDocs(qInsurance);
        
        if (!insuranceSnap.empty) {
          return { role: 'Team', department: 'Public' };
        }
      } catch (e) {
        console.warn("⚠️ Insurance Query Warning:", e.message);
      }

      return null;
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  }
};