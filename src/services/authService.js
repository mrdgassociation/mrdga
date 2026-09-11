import { auth, googleProvider, db } from '../firebase/config';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { notificationService } from './notificationService';

export const authService = {
  // 🔑 Google Sign-In with Multi-Role Checking
  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const emailLower = user.email.toLowerCase();

      // 🔍 १. 'users' कलेक्शन (Staff / Admin / Super Admin)
      const userDocRef = doc(db, "users", emailLower);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const isUserActive = userData.isActive !== false && userData.status !== "Inactive";

        if (!isUserActive) {
          console.error("❌ Account is Inactive!");
          await signOut(auth);
          throw new Error("ACCOUNT_INACTIVE");
        }

        try {
          notificationService.requestPushPermission(emailLower);
        } catch (pushErr) {
          console.warn("⚠️ Push Permission warning on login:", pushErr);
        }

        return {
          ...user,
          role: userData.role || "Reviewer",
          department: userData.department || "MRDGA",
          spainTourAccess: userData.spainTourAccess || false
        };
      }

      // 🇪🇸 २. 'spain_tour_whitelist' (बाहेरील स्पेन दौरा पाहुणे सदस्य)
      try {
        const whitelistDocRef = doc(db, "spain_tour_whitelist", emailLower);
        const whitelistDoc = await getDoc(whitelistDocRef);

        if (whitelistDoc.exists() && whitelistDoc.data().isActive !== false) {
          const wData = whitelistDoc.data();

          try {
            notificationService.requestPushPermission(emailLower);
          } catch (pushErr) {
            console.warn("⚠️ Push Permission warning on login:", pushErr);
          }

          return {
            ...user,
            role: wData.role || "Traveler",
            department: "SPAIN_GUEST", // 👈 या टॅगमुळे त्याला फक्त स्पेन दिसेल, MRDGA चे काहीही दिसणार नाही
            spainTourAccess: true,
            isSpainGuest: true
          };
        }
      } catch (wErr) {
        console.warn("⚠️ Whitelist check warning:", wErr.message);
      }

      // 🏆 ३. 'teams' (स्पर्धा फॉर्म युझर्स)
      try {
        const qTeams = query(collection(db, "teams"), where("email", "==", emailLower));
        const teamSnap = await getDocs(qTeams);

        if (!teamSnap.empty) {
          try {
            notificationService.requestPushPermission(emailLower);
          } catch (pushErr) {
            console.warn("⚠️ Push Permission warning on login:", pushErr);
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

      // 🛡️ ४. 'insurance_requests_2026' (विमा फॉर्म युझर्स)
      try {
        const qInsurance = query(collection(db, "insurance_requests_2026"), where("email", "==", emailLower));
        const insuranceSnap = await getDocs(qInsurance);

        if (!insuranceSnap.empty) {
          try {
            notificationService.requestPushPermission(emailLower);
          } catch (pushErr) {
            console.warn("⚠️ Push Permission warning on login:", pushErr);
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

      // 🛑 ५. कुठेही नोंद नसलेला युझर ब्लॉक करा
      console.error("❌ Access Denied: User email not authorized!");
      await signOut(auth);
      throw new Error("UNAUTHORIZED_EMAIL");

    } catch (error) {
      console.error("❌ Auth Error:", error.message || error);
      throw error;
    }
  },

  // 🚪 Logout
  async logout() {
    try {
      await signOut(auth);
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
          spainTourAccess: data.spainTourAccess || false,
          isSuperAdmin: (data.department === "SUPER" || data.role === "Super Admin") && (data.isActive !== false && data.status !== "Inactive")
        };
      }

      // 2. Check in 'spain_tour_whitelist' (Spain Guests)
      try {
        const whitelistDocRef = doc(db, "spain_tour_whitelist", emailLower);
        const whitelistDoc = await getDoc(whitelistDocRef);

        if (whitelistDoc.exists() && whitelistDoc.data().isActive !== false) {
          const wData = whitelistDoc.data();
          return {
            role: wData.role || "Traveler",
            department: "SPAIN_GUEST",
            spainTourAccess: true,
            isSpainGuest: true,
            isSuperAdmin: false
          };
        }
      } catch (wErr) {
        console.warn("⚠️ Whitelist Query Warning:", wErr.message);
      }

      // 3. Check in 'teams' collection
      try {
        const qTeams = query(collection(db, "teams"), where("email", "==", emailLower));
        const teamSnap = await getDocs(qTeams);
        
        if (!teamSnap.empty) {
          return { role: 'Team', department: 'Public' };
        }
      } catch (e) {
        console.warn("⚠️ Team Query Warning:", e.message);
      }

      // 4. Check in 'insurance_requests_2026' collection
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