import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { authService } from '../services/authService';
import CompetitionReportTab from '../components/CompetitionReportTab';
import InsuranceReportTab from '../components/InsuranceReportTab';
import { BarChart3, Shield, Trophy, Lock } from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('competition'); // 'competition' | 'insurance'
  const [teams, setTeams] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [competitionFilter, setCompetitionFilter] = useState('ALL');

  // Role & Department States
  const [userRole, setUserRole] = useState('Reviewer');
  const [userDepartment, setUserDepartment] = useState('MRDGA');

  const loadReportsData = async () => {
    setLoading(true);
    try {
      const [teamsData, compsData] = await Promise.all([
        dataService.getAllTeams(),
        dataService.getAllCompetitions ? dataService.getAllCompetitions() : []
      ]);
      setTeams(teamsData || []);
      setCompetitions(compsData || []);
    } catch (err) {
      console.error("Error loading reports data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user) {
        try {
          const userDoc = await authService.getUserRole(user.email);
          if (userDoc) {
            if (userDoc.role) setUserRole(userDoc.role);
            if (userDoc.department) setUserDepartment(userDoc.department);
          }
        } catch (e) {
          console.error("Role fetch error:", e);
        }
        loadReportsData();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const selectedCompObj = competitions.find(c => (c.competitionId || c.id) === competitionFilter);
  const selectedCompTitle = competitionFilter === 'ALL' 
    ? 'सर्व दहीहंडी स्पर्धांचा एकत्रित अहवाल' 
    : (selectedCompObj?.title || competitionFilter);

  const hasAccessToReports = userRole === 'Super Admin' || userDepartment === 'SUPER' || userDepartment === 'MRDGA';
  const canExportAndPrint = hasAccessToReports && ['Super Admin', 'Admin'].includes(userRole);

  if (!loading && !hasAccessToReports) {
    return (
      <div className="p-8 text-center space-y-3 font-sans">
        <Lock className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-white">तुम्हाला या अहवालाचा ॲक्सेस नाही.</h2>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 py-4 font-sans text-white">

      {/* 🔘 TAB NAVIGATION BUTTONS */}
      <div className="no-print flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('competition')}
          className={`py-2.5 px-5 font-extrabold text-xs sm:text-sm rounded-t-2xl transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'competition'
              ? 'bg-[#0c0d14] border-t-2 border-amber-500 text-amber-400 border-x border-slate-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" /> स्पर्धा अहवाल (Competition Report)
        </button>

        <button
          onClick={() => setActiveTab('insurance')}
          className={`py-2.5 px-5 font-extrabold text-xs sm:text-sm rounded-t-2xl transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'insurance'
              ? 'bg-[#0c0d14] border-t-2 border-amber-500 text-amber-400 border-x border-slate-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4 text-amber-400" /> गोविंदा विमा अहवाल (Insurance Report)
        </button>
      </div>

      {/* ---------------- 🏆 TAB 1: COMPETITION REPORT ---------------- */}
      {activeTab === 'competition' && (
        <CompetitionReportTab 
          teams={teams}
          competitions={competitions}
          competitionFilter={competitionFilter}
          setCompetitionFilter={setCompetitionFilter}
          canExportAndPrint={canExportAndPrint}
          selectedCompTitle={selectedCompTitle}
        />
      )}

      {/* ---------------- 🛡️ TAB 2: INSURANCE REPORT ---------------- */}
      {activeTab === 'insurance' && (
        <InsuranceReportTab 
          canExportAndPrint={canExportAndPrint}
        />
      )}

    </div>
  );
}