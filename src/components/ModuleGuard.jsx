import React, { useEffect, useState } from 'react';
import { dataService } from '../services/dataService';
import { Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ModuleGuard({ pageKey, children }) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const config = await dataService.getPageConfig();
        // जर ते पेज 'false' असेल तर ब्लॉक करा
        if (config && config[pageKey] === false) {
          setIsEnabled(false);
        } else {
          setIsEnabled(true);
        }
      } catch (err) {
        console.error("Config check error:", err);
      } finally {
        setLoading(false);
      }
    };
    checkConfig();
  }, [pageKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090d] flex items-center justify-center text-amber-400 font-bold text-xs animate-pulse">
        माहिती लोड होत आहे...
      </div>
    );
  }

  // 🛑 जर पेज बंद (OFF) असेल तर Coming Soon Screen दाखवा
  if (!isEnabled) {
    return (
      <div className="min-h-[80vh] bg-[#08090d] flex flex-col items-center justify-center p-6 text-center font-sans space-y-4">
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-3xl animate-bounce">
          <Clock className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-black text-white">हे पृष्ठ लवकरच सुरू होत आहे!</h1>
        <p className="text-xs text-gray-400 max-w-md leading-relaxed">
          या विभागाचे काम प्रगतीपथावर आहे. अधिकृत नोंदणी फॉर्म भरण्यासाठी किंवा माहितीसाठी खालील बटणावर क्लिक करा.
        </p>
        <Link 
          to="/" 
          className="px-5 py-2.5 bg-amber-500 text-black font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition"
        >
          <ArrowLeft className="w-4 h-4" /> मुख्य पानावर जा (Home)
        </Link>
      </div>
    );
  }

  // 🟢 जर चालू (ON) असेल तर मूळ पेज दाखवा
  return children;
}