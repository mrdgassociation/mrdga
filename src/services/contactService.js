import { db } from "../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";

const CONTACTS_DOC_ID = 'mrdga_contacts_config';
const LOCAL_STORAGE_KEY = 'mrdga_contacts_cache';

export const contactService = {
  // 📥 1. गेट कांटेक्ट्स (0 to 1 Read Strategy)
  getContacts: async () => {
    // A. आधी कॅश (Cache) मधून डेटा तपासा
    const cachedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cachedData) {
      console.log("⚡ [CONTACTS] Loaded from LocalCache (0 Reads)");
      // बॅकग्राउंडला किंवा कॅशमधील डेटा लगेच रिटर्न करा
    }

    try {
      // B. फायरबेसमधून फक्त १ डॉक्युमेंट फेच करा (1 Read)
      const docRef = doc(db, 'site_config', CONTACTS_DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data().groups || [];
        // नवीन डेटा कॅशमध्ये अपडेट करा
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    } catch (err) {
      console.error("❌ Error fetching contacts from Firestore:", err);
    }

    // C. नेटवर्क नसल्यास किंवा एरर आल्यास सेव्ह केलेला किंवा फॉलबॅक डेटा वापरा
    return cachedData ? JSON.parse(cachedData) : null;
  },

  // 💾 2. अपडेट कांटेक्ट्स (Only for SuperAdmin - Write)
  saveContacts: async (groupsData) => {
    try {
      const docRef = doc(db, 'site_config', CONTACTS_DOC_ID);
      await setDoc(docRef, { groups: groupsData, updatedAt: new Date().toISOString() }, { merge: true });
      
      // कॅश अपडेट करा
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(groupsData));
      return true;
    } catch (err) {
      console.error("❌ Error saving contacts to Firestore:", err);
      throw err;
    }
  }
};