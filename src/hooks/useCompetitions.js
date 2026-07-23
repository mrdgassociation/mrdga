import { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config'; 
import { 
  collection, doc, getDocs, getDoc, 
  setDoc, addDoc, updateDoc, deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';

export function useCompetitions() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔄 Fetch Competitions with Local Cache Engine
  const fetchCompetitions = async () => {
    try {
      setLoading(true);

      const cachedData = localStorage.getItem('mrdga_competitions');
      const cachedVersion = localStorage.getItem('mrdga_comp_version');

      const configRef = doc(db, 'system_config', 'competitions');
      const configSnap = await getDoc(configRef);

      let currentRemoteVersion = 0;
      if (configSnap.exists()) {
        currentRemoteVersion = configSnap.data().version || 0;
      }

      if (cachedData && cachedVersion && parseInt(cachedVersion) === currentRemoteVersion) {
        setCompetitions(JSON.parse(cachedData));
        setLoading(false);
        return;
      }

      const compRef = collection(db, 'competitions');
      const snapshot = await getDocs(compRef);
      
      const list = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const validCompId = data.competitionId || docSnap.id;
        
        return {
          id: docSnap.id,
          ...data,
          competitionId: validCompId,
          regLink: data.regLink && data.regLink !== '#/form/2026' ? data.regLink : `#/form/${validCompId}`
        };
      });

      localStorage.setItem('mrdga_competitions', JSON.stringify(list));
      localStorage.setItem('mrdga_comp_version', currentRemoteVersion.toString());

      setCompetitions(list);
    } catch (err) {
      console.error("Error fetching competitions:", err);
      const cachedData = localStorage.getItem('mrdga_competitions');
      if (cachedData) setCompetitions(JSON.parse(cachedData));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  // ✏️ Version Bump Helper
  const bumpVersion = async () => {
    try {
      const configRef = doc(db, 'system_config', 'competitions');
      const newVersion = Date.now();
      await setDoc(configRef, { version: newVersion, updated_at: serverTimestamp() }, { merge: true });
      return newVersion;
    } catch (err) {
      console.error("Bump Version Error (Non-critical):", err);
    }
  };

  // ➕ Add Competition
  const addCompetition = async (data) => {
    try {
      const compRef = collection(db, 'competitions');
      const docRef = await addDoc(compRef, {
        ...data,
        created_at: serverTimestamp()
      });
      
      await bumpVersion();
      await fetchCompetitions();
      return docRef.id;
    } catch (err) {
      console.error("Add Competition Error:", err);
      throw err;
    }
  };

  // 📝 Update Competition
  const updateCompetition = async (id, data) => {
    try {
      const docRef = doc(db, 'competitions', id);
      await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
      
      await bumpVersion();
      await fetchCompetitions();
    } catch (err) {
      console.error("Update Competition Error:", err);
      throw err;
    }
  };

  // 🗑️ Delete Competition
  const deleteCompetition = async (id) => {
    try {
      const docRef = doc(db, 'competitions', id);
      await deleteDoc(docRef);
      
      await bumpVersion();
      await fetchCompetitions();
    } catch (err) {
      console.error("Delete Competition Error:", err);
      throw err;
    }
  };

  return { competitions, loading, addCompetition, updateCompetition, deleteCompetition, refresh: fetchCompetitions };
}