import React from 'react';
import { Shield, LogOut, GitCompare, CheckSquare, Table2, BarChart } from 'lucide-react';
import { TabId } from '../types';

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onLogout: () => void;
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'comparison', label: 'Data Comparison', icon: <GitCompare className="w-4 h-4" /> },
  { id: 'quality', label: 'Data Quality Check', icon: <CheckSquare className="w-4 h-4" /> },
  { id: 'pivot', label: 'Pivot Table', icon: <Table2 className="w-4 h-4" /> },
  { id: 'frequency', label: 'Frequency Analysis', icon: <BarChart className="w-4 h-4" /> },
];

export default function AppHeader({ activeTab, onTabChange, onLogout }: Props) {
  return (
    <header className="bg-amber-400 sticky top-0 z-40 shadow-md">
      <div className="max-w-screen-2xl mx-auto px-4">
        {/* Top row */}
        <div className="flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-md shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-amber-950 leading-tight">EHA-(AMF-PDM)</h1>
              <p className="text-xs text-amber-900">Survey Data Quality Monitoring Analyser</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-950 hover:text-red-700
                       hover:bg-red-50 rounded-xl transition-all duration-200 border border-transparent hover:border-red-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Tab row */}
        <nav className="flex gap-1 pb-3 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 transition-all duration-200 rounded-xl px-4 py-2 text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-900 text-amber-50 font-semibold'
                  : 'text-amber-950 hover:bg-amber-300/50 font-medium'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
