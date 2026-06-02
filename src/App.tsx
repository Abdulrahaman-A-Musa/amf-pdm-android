import React from 'react';
import { useAppStore } from './store/useAppStore';
import LoginPage from './components/LoginPage';
import AppHeader from './components/AppHeader';
import DataComparison from './components/DataComparison';
import DataQuality from './components/DataQuality';
import PivotTable from './components/PivotTable';
import FrequencyAnalysis from './components/FrequencyAnalysis';

export default function App() {
  const { isLoggedIn, activeTab, login, logout, setActiveTab } = useAppStore();

  if (!isLoggedIn) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader activeTab={activeTab} onTabChange={setActiveTab} onLogout={logout} />

      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        <div className="animate-fade-in">
          {activeTab === 'comparison' && <DataComparison />}
          {activeTab === 'quality' && <DataQuality />}
          {activeTab === 'pivot' && <PivotTable />}
          {activeTab === 'frequency' && <FrequencyAnalysis />}
        </div>
      </main>

      <footer className="mt-12 py-4 border-t border-slate-200 bg-white">
        <p className="text-center text-xs text-slate-400">
          EHA-(AMF-PDM) Survey Data Quality Monitoring Analyser · Against Malaria Foundation · 2025
        </p>
      </footer>
    </div>
  );
}
