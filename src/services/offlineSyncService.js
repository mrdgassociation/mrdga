import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const DB_CACHE_PREFIX = "mrdga_cache_";
const TIME_KEY_PREFIX = "mrdga_synctime_";

export const offlineSyncService = {
  // 🎯 स्मार्ट इन्क्रिमेंटल फेच (फक्त नवीन किंवा बदललेला डेटा आणणे)
  async getSyncData(collectionName) {
    const cacheKey = `${DB_CACHE_PREFIX}${collectionName}`;
    const timeKey = `${TIME_KEY_PREFIX}${collectionName}`;

    const localData = JSON.parse(localStorage.getItem(cacheKey) || '[]');
    const lastSyncTime = localStorage.getItem(timeKey);

    // १. जर स्थानिक कॅश रिकामी असेल, तर पहिल्यांदा पूर्ण फेच (फक्त १ वेळा)
    if (!lastSyncTime || localData.length === 0) {
      const snap = await getDocs(collection(db, collectionName));
      const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      localStorage.setItem(cacheKey, JSON.stringify(allDocs));
      localStorage.setItem(timeKey, new Date().toISOString());
      return allDocs;
    }

    // २. फक्त नंतर ॲड/अपडेट झालेला डेटा आणा (Delta Fetch)
    try {
      const q = query(
        collection(db, collectionName),
        where("updatedAt", ">", new Date(lastSyncTime))
      );
      
      const deltaSnap = await getDocs(q);
      
      // बदल नसेल तर थेट स्थानिक डेटा द्या (खर्च: ० Reads)
      if (deltaSnap.empty) {
        return localData;
      }

      const updatedItems = deltaSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // जुन्या कॅशमध्ये नवीन बदल एकत्र (Merge) करा
      const mergedMap = new Map(localData.map(item => [item.id, item]));
      updatedItems.forEach(item => mergedMap.set(item.id, item));
      
      const finalMergedList = Array.from(mergedMap.values());
      
      localStorage.setItem(cacheKey, JSON.stringify(finalMergedList));
      localStorage.setItem(timeKey, new Date().toISOString());
      
      return finalMergedList;
    } catch (err) {
      // इंडेक्स किंवा फिल्ड नसल्यास सुरक्षित फॉलबॅक
      return localData;
    }
  },

  // 🎯 मॅन्युअल रिफ्रेशसाठी कॅश क्लिअर
  clearCache(collectionName) {
    localStorage.removeItem(`${DB_CACHE_PREFIX}${collectionName}`);
    localStorage.removeItem(`${TIME_KEY_PREFIX}${collectionName}`);
  }
};