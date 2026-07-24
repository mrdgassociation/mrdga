import { db } from "../firebase/config";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where,
  arrayUnion // 👈 Missing import added for addTeamComment
} from "firebase/firestore";

/**
 * ImgBB Free Image Upload Helper Function
 */
export async function uploadToImgBB(file) {
  if (!file) return null;

  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;

  const getBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  if (!apiKey) {
    console.error("❌ VITE_IMGBB_API_KEY Missing!");
    return await getBase64(file);
  }

  try {
    const base64Data = (await getBase64(file)).split(',')[1];
    const formData = new FormData();
    formData.append("image", base64Data);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      console.log("📸 ImgBB Direct Image Link:", data.data.url);
      return data.data.url;
    } else {
      console.warn("⚠️ ImgBB Error! Fallback to Base64:", data.error?.message);
      return await getBase64(file);
    }
  } catch (error) {
    console.warn("⚠️ ImgBB Upload Failed, using Local Fallback:", error);
    return await getBase64(file);
  }
}

// 🎯 Fetch Single Competition Details
export const getCompetitionDetails = async (compId) => {
  console.log("==========================================");
  console.log("🔍 [FETCH COMP DETAIL] Target ID:", compId);

  try {
    if (!compId || compId === '2026' || compId === '2025' || compId === '2027') {
      console.log("ℹ️ [FETCH COMP DETAIL] General Year Form Detected:", compId);
      return {
        title: "महाराष्ट्र राज्य दहीहंडी असोसिएशन अधिकृत नोंदणी",
        season: compId || "2026",
        isGeneral: true
      };
    }

    const docRef = doc(db, 'competitions', compId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("✅ [FETCH COMP DETAIL] Found by Doc ID:", docSnap.data());
      return docSnap.data();
    }

    console.log("🔎 [FETCH COMP DETAIL] Querying by competitionId field...");
    const q = query(collection(db, 'competitions'), where('competitionId', '==', compId));
    const querySnap = await getDocs(q);

    if (!querySnap.empty) {
      const foundData = querySnap.docs[0].data();
      console.log("✅ [FETCH COMP DETAIL] Found by competitionId Query:", foundData);
      return foundData;
    }

    console.warn("⚠️ [FETCH COMP DETAIL] No document found for:", compId);
    return {
      title: "महाराष्ट्र राज्य दहीहंडी असोसिएशन अधिकृत नोंदणी",
      season: "2026",
      isGeneral: true
    };

  } catch (err) {
    console.error("❌ [FETCH COMP DETAIL ERROR]:", err);
    return null;
  }
};

// 🎯 SECTION: Fetch All Competitions List (Latest First)
export const getAllCompetitions = async () => {
  console.log("==========================================");
  console.log("🔍 [getAllCompetitions] Fetching all competitions from Firestore...");
  try {
    const querySnapshot = await getDocs(collection(db, 'competitions'));
    const list = [];
    querySnapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });
    
    // 💡 Latest Competitions Top ला दाखवण्यासाठी Sorting
    list.sort((a, b) => (b.startDate || b.competitionId || '').localeCompare(a.startDate || a.competitionId || ''));

    console.log("📊 [getAllCompetitions] Sorted List:", list);
    return list;
  } catch (err) {
    console.error("❌ [getAllCompetitions ERROR]:", err);
    return [];
  }
};

// 🎯 SECTION: Update Competition Wise Form Status
// 🎯 SECTION: Smart Competition Form Status Update (dataService.js)
export const updateCompetitionFormStatus = async (compId, isFormOpen) => {
  console.log(`==========================================`);
  console.log(`⏳ [UPDATE COMP FORM] Target ID: ${compId} | New Status: ${isFormOpen}`);

  try {
    // 1️⃣ आधी Direct Document ID ने अपडेट करण्याचा प्रयत्न करा
    const directDocRef = doc(db, "competitions", compId);
    const directSnap = await getDoc(directDocRef);

    if (directSnap.exists()) {
      await updateDoc(directDocRef, {
        isFormOpen,
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ [UPDATE COMP FORM] Updated directly by Doc ID: ${compId}`);
      return true;
    }

    // 2️⃣ जर Doc ID ने नसेल सापडला, तर 'competitionId' Field वरून Query करा
    console.log(`🔎 [UPDATE COMP FORM] Searching by competitionId field...`);
    const q = query(collection(db, "competitions"), where("competitionId", "==", compId));
    const querySnap = await getDocs(q);

    if (!querySnap.empty) {
      const targetDocId = querySnap.docs[0].id;
      const targetDocRef = doc(db, "competitions", targetDocId);
      await updateDoc(targetDocRef, {
        isFormOpen,
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ [UPDATE COMP FORM] Updated via Query Doc ID: ${targetDocId}`);
      return true;
    }

    // 3️⃣ जर डॉक्युमेंट नसेलच, तर setDoc (Merge: true) ने नवीन सेव्ह / अपडेट करा
    console.warn(`⚠️ [UPDATE COMP FORM] No existing doc found. Creating/Merging with setDoc...`);
    await setDoc(directDocRef, {
      competitionId: compId,
      isFormOpen,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`✅ [UPDATE COMP FORM] Created/Merged successfully for: ${compId}`);
    return true;

  } catch (error) {
    console.error("❌ [UPDATE COMP FORM ERROR]:", error);
    throw error;
  }
};
/**
 * Main Data Service Layer (Pure Firestore + ImgBB)
 */
export const dataService = {

  // 🔍 डुप्लिकेट चेक फंक्शन
  async checkDuplicateTeam(teamName, captainPhone, season = "2026") {
    try {
      const qName = query(
        collection(db, "teams"),
        where("season", "==", season),
        where("teamName", "==", teamName.trim())
      );
      const nameSnap = await getDocs(qName);

      if (!nameSnap.empty) {
        return { isDuplicate: true, reason: `"${teamName}" या नावाचा संघ आधीच नोंदणीकृत आहे!` };
      }

      const qPhone = query(
        collection(db, "teams"),
        where("season", "==", season),
        where("captain.phone", "==", captainPhone.trim())
      );
      const phoneSnap = await getDocs(qPhone);

      if (!phoneSnap.empty) {
        return { isDuplicate: true, reason: `मोबाईल नंबर ${captainPhone} वरून आधीच एक संघ नोंदवला गेला आहे!` };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error("Duplicate check error:", error);
      return { isDuplicate: false };
    }
  },

  // Save or Update Team
  async saveTeam(teamData, files = {}) {
    const uploadedUrls = {};
    console.log("⏳ Uploading images to ImgBB...");

    for (const [key, file] of Object.entries(files)) {
      if (file && typeof file !== 'string') {
        const imageUrl = await uploadToImgBB(file);
        if (imageUrl) {
          uploadedUrls[key] = imageUrl;
        }
      }
    }

    const payload = {
      ...teamData,
      media: {
        ...(teamData.media || {}),
        ...uploadedUrls
      },
      updatedAt: new Date().toISOString()
    };

    if (!teamData.createdAt) {
      payload.createdAt = new Date().toISOString();
    }

    await setDoc(doc(db, "teams", teamData.registrationId), payload, { merge: true });
    return payload;
  },

  // Fetch Single Record
  async getTeamById(registrationId) {
    const docRef = doc(db, "teams", registrationId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  },

  // Fetch All Teams (Admin Dashboard)
  async getAllTeams(season = "2026") {
    const q = query(collection(db, "teams"), where("season", "==", season));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  },

  // Update Status / Admin Comment
  async updateTeamStatus(registrationId, status, internalNote = "") {
    const teamRef = doc(db, "teams", registrationId);
    await updateDoc(teamRef, {
      status,
      internalNote,
      updatedAt: new Date().toISOString()
    });
  },

  // Team Comments & Remarks
  async addTeamComment(regId, commentData) {
    try {
      const teamRef = doc(db, "teams", regId);
      await updateDoc(teamRef, {
        comments: arrayUnion({
          id: Date.now().toString(),
          byEmail: commentData.email,
          byName: commentData.name || 'Admin',
          role: commentData.role || 'Reviewer',
          text: commentData.text,
          createdAt: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error("❌ Error adding comment:", error);
      throw error;
    }
  },

  // User Management APIs
  async getAllUsers() {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      return snapshot.docs.map(doc => ({ email: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },

// 🎯 dataService.js मधील फंक्शन असे असावे:
  async createOrUpdateUser(userData) {
    try {
      const emailLower = userData.email.toLowerCase().trim();
      const userRef = doc(db, 'users', emailLower);

      // 🛑 इथं आपण department समाविष्ट करत आहोत:
      const payload = {
        email: emailLower,
        name: userData.name || '',
        phone: userData.phone || '',
        role: userData.role || 'Reviewer',
        department: userData.department || 'MRDGA', // 👈 हे आधी मिसिंग होतं!
        isActive: userData.isActive !== false,
        status: userData.status || 'Active',
        updatedAt: new Date().toISOString()
      };

      await setDoc(userRef, payload, { merge: true });
      return true;
    } catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  },

  // Form Status APIs (Global or Competition Wise)
  async getFormStatus(compId = "general") {
    try {
      const docRef = doc(db, "settings", `registration_status_${compId}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return { isOpen: true, message: "नोंदणी सुरू आहे." };
    } catch (error) {
      return { isOpen: true };
    }
  },

  async updateFormStatus(isOpen, compId = "general", message = "") {
    try {
      const docRef = doc(db, "settings", `registration_status_${compId}`);
      await setDoc(docRef, {
        isOpen,
        message,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error("Error updating form status:", error);
      throw error;
    }
  },

  // 🎯 Page Configuration Get and Update Functions

async getPageConfig() {
  try {
    const docRef = doc(db, 'site_config', 'modules');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    // Default Fallback Config (जर डेटाबेसमध्ये नसेल तर)
    return {
      aboutPage: false,
      insurancePage: false,
      contactPage: false,
      competitionPage: true
    };
  } catch (err) {
    console.error("Page config fetch error:", err);
    return { aboutPage: false, insurancePage: false, contactPage: false, competitionPage: true };
  }
},

async updatePageConfig(newConfig) {
  try {
    const docRef = doc(db, 'site_config', 'modules');
    await setDoc(docRef, newConfig, { merge: true });
    return true;
  } catch (err) {
    console.error("Page config update error:", err);
    throw err;
  }
},

  // Helper Functions Export
  getAllCompetitions,
  getCompetitionDetails,
  updateCompetitionFormStatus
};

