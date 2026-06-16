import React from 'react';
import { useAppStore } from './store/useAppStore';
import LoginPage from './components/LoginPage';
import AppHeader from './components/AppHeader';
import Dashboard from './components/Dashboard';
import DataComparison from './components/DataComparison';
import DataQuality from './components/DataQuality';

export default function App() {
  const { isLoggedIn, activeTab, login, logout, setActiveTab } = useAppStore();

  if (!isLoggedIn) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppHeader activeTab={activeTab} onTabChange={setActiveTab} onLogout={logout} />

      {activeTab === 'dashboard' ? (
        <div className="flex-1 animate-fade-in">
          <Dashboard />
        </div>
      ) : (
        <main className="max-w-screen-2xl mx-auto px-4 py-6 w-full">
          <div className="animate-fade-in">
            {activeTab === 'comparison' && <DataComparison />}
            {activeTab === 'quality'    && <DataQuality />}
          </div>
        </main>
      )}

      <footer className="py-4 border-t border-slate-200 bg-white">
        <p className="text-center text-xs text-slate-400">
          EHA-(AMF-PDM) Survey Data Quality Monitoring Analyser · Against Malaria Foundation · 2026
        </p>
      </footer>
    </div>
  );
}
