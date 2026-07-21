import { db } from "../firebase/config";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where 
} from "firebase/firestore";

/**
 * ImgBB Free Image Upload Helper Function
 */
export async function uploadToImgBB(file) {
  if (!file) return null;

  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (!apiKey) {
    console.error("❌ VITE_IMGBB_API_KEY Missing! Check your .env file.");
    return null;
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      console.log("📸 ImgBB Direct Image Link:", data.data.url);
      return data.data.url;
    } else {
      console.error("❌ ImgBB API Error:", data);
      return null;
    }
  } catch (error) {
    console.error("❌ Upload Error to ImgBB:", error);
    return null;
  }
}

/**
 * Main Data Service Layer (Pure Firestore + ImgBB)
 */


export const dataService = {
  

    // 🔍 डुप्लिकेट चेक फंक्शन
  async checkDuplicateTeam(teamName, captainPhone, season = "2026") {
    try {
      // १. आधी टीमच्या नावाने चेक करा (Exact Match)
      const qName = query(
        collection(db, "teams"),
        where("season", "==", season),
        where("teamName", "==", teamName.trim())
      );
      const nameSnap = await getDocs(qName);

      if (!nameSnap.empty) {
        return { isDuplicate: true, reason: `"${teamName}" या नावाचा संघ आधीच नोंदणीकृत आहे!` };
      }

      // २. किंवा कॅप्टनच्या मोबाईल नंबरने चेक करा
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
      return { isDuplicate: false }; // एरर आल्यास सबमिशन न रोखता पुढे जाऊ द्यावे
    }
  },



  // Save or Update Team (Form Submit साठी)
  async saveTeam(teamData, files = {}) {
    const uploadedUrls = {};

    console.log("⏳ Uploading images to ImgBB...");

    // Upload Files via ImgBB (Logo & Captain Photo)
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

    console.log("📦 Saving Final Payload to Firestore...", payload);

    // Save to Firestore Collection ("teams")
    await setDoc(doc(db, "teams", teamData.registrationId), payload, { merge: true });
    
    console.log("🎉 Successfully Saved in Firestore!");
    return payload;
  },

  // Fetch Single Record
  async getTeamById(registrationId) {
    const docRef = doc(db, "teams", registrationId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  },

  // Fetch All Teams (Admin Dashboard साठी)
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

  // 💡 TEAM COMMENTS & REMARKS PATCH
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
      console.log("✅ Comment added successfully!");
    } catch (error) {
      console.error("❌ Error adding comment:", error);
      throw error;
    }
  },

  // 💡 USER MANAGEMENT APIS (Only for Super Admin)
  async getAllUsers() {
    try {
      const usersCol = collection(db, "users");
      const snapshot = await getDocs(usersCol);
      return snapshot.docs.map(doc => ({ email: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },

  async createOrUpdateUser(userData) {
    try {
      const userRef = doc(db, "users", userData.email.toLowerCase().trim());
      await setDoc(userRef, {
        email: userData.email.toLowerCase().trim(),
        name: userData.name || '',
        phone: userData.phone || '',
        role: userData.role || 'Reviewer',
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  }
  

};

