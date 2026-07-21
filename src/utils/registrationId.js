import { db } from "../firebase/config";
import { doc, runTransaction } from "firebase/firestore";

/**
 * ऑटो-सिक्वेन्शियल आयडी जनरेटर
 * उदा: MRDGA-26-M7-00001
 */
export async function generateRegistrationId(categoryCode, seasonYear = "26") {
  const cleanCategory = categoryCode.toUpperCase().replace(/\s+/g, '');
  const counterDocRef = doc(db, "counters", `${seasonYear}_${cleanCategory}`);

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterDocRef);
    let currentCount = 1;

    if (counterDoc.exists()) {
      currentCount = counterDoc.data().lastNumber + 1;
    }

    // काउंटर +१ ने अपडेट करणे
    transaction.set(counterDocRef, { lastNumber: currentCount }, { merge: true });

    // ५ डिजिट्सचा सिक्वेन्स नंबर (00001, 00002)
    const formattedNumber = String(currentCount).padStart(5, '0');
    return `MRDGA-${seasonYear}-${cleanCategory}-${formattedNumber}`;
  });
}