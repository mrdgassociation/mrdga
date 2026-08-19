// ==========================================
// #SECTION: TOURNAMENT SCORING HUB (4 TABS CONTAINER)
// ==========================================
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Trophy, ArrowLeft, Layers, Users, Play, Award } from 'lucide-react';
import ScoringRoundSetup from '../components/scoring/ScoringRoundSetup';
import ScoringTeamSetup from '../components/scoring/ScoringTeamSetup';
import ScoringJudgeConsole from '../components/scoring/ScoringJudgeConsole';
import ScoringLeaderboardTab from '../components/scoring/ScoringLeaderboardTab';

export default function TournamentScoringHub() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ROUNDS'); // 'ROUNDS' | 'TEAMS' | 'SCORING' | 'RANKINGS'

  useEffect(() => {
    const fetchTournament = async () => {
      if (!tournamentId) return;
      try {
        const docRef = doc(db, 'dahi_handi_tournaments', tournamentId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setTournament({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("Error fetching tournament:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTournament();
  }, [tournamentId]);

  if (loading) {
    return <div className="p-8 text-center text-amber-400 text-xs animate-pulse font-bold">स्पर्धा लोड होत आहे...</div>;
  }

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-3 space-y-4 text-white font-sans">
      
      {/* 🔹 वरची मुख्य माहिती पट्टी */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0c0d14] border border-amber-500/20 p-3 sm:p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/admin/tournaments')}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white transition cursor-pointer"
            title="मागे जा"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> {tournament?.tournamentName || 'दहीहंडी स्पर्धा'}
            </h1>
            <p className="text-[10px] text-gray-400">
              📍 {tournament?.location || 'महाराष्ट्र'} • 📅 {tournament?.startDate} {tournament?.endDate ? `ते ${tournament?.endDate}` : ''}
            </p>
          </div>
        </div>

        {/* 📑 ४ टॅब्स नेव्हिगेशन */}
        <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('ROUNDS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'ROUNDS' 
                ? 'bg-amber-500 text-black shadow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>१. फेऱ्या व नियम</span>
          </button>

          <button
            onClick={() => setActiveTab('TEAMS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'TEAMS' 
                ? 'bg-amber-500 text-black shadow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>२. संघ व सामने</span>
          </button>

          <button
            onClick={() => setActiveTab('SCORING')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'SCORING' 
                ? 'bg-amber-500 text-black shadow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>३. थेट स्कोअरिंग</span>
          </button>

          {/* 🏆 ४था नवीन रँकिंग टॅब */}
          <button
            onClick={() => setActiveTab('RANKINGS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'RANKINGS' 
                ? 'bg-amber-500 text-black shadow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>४. रँकिंग & गुणतक्ता</span>
          </button>
        </div>
      </div>

      {/* 🔹 टॅबनुसार लोड होणारे कॉम्पोनंट्स */}
      {activeTab === 'ROUNDS' && (
        <ScoringRoundSetup tournamentId={tournamentId} />
      )}

      {activeTab === 'TEAMS' && (
        <ScoringTeamSetup tournamentId={tournamentId} />
      )}

      {activeTab === 'SCORING' && (
        <ScoringJudgeConsole tournamentId={tournamentId} />
      )}

      {activeTab === 'RANKINGS' && (
        <ScoringLeaderboardTab 
          tournamentId={tournamentId} 
          onNavigateToDuels={() => setActiveTab('TEAMS')}
        />
      )}

    </div>
  );
}