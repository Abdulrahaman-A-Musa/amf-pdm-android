import React, { useState, useEffect } from 'react';
import {
  Shield, LogOut, GitCompare, CheckSquare, Table2, BarChart,
  LayoutDashboard, Maximize2, Minimize2,
} from 'lucide-react';
import { TabId } from '../types';
import { useAppStore } from '../store/useAppStore';

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onLogout: () => void;
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',  label: 'Dashboard',          icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'comparison', label: 'Data Comparison',     icon: <GitCompare className="w-4 h-4" /> },
  { id: 'quality',    label: 'Data Quality Check',  icon: <CheckSquare className="w-4 h-4" /> },
  { id: 'pivot',      label: 'Pivot Table',          icon: <Table2 className="w-4 h-4" /> },
  { id: 'frequency',  label: 'Frequency Analysis',  icon: <BarChart className="w-4 h-4" /> },
];

const STATES = ['Zamfara', 'Bauchi', 'Plateau'];

export default function AppHeader({ activeTab, onTabChange, onLogout }: Props) {
  const { selectedState, setSelectedState } = useAppStore();
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="bg-amber-400 sticky top-0 z-40 shadow-md">
      <div className="max-w-screen-2xl mx-auto px-4">
        {/* Top row */}
        <div className="flex items-center justify-between h-14 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-md shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-amber-950 leading-tight">EHA-(AMF-PDM)</h1>
              <p className="text-xs text-amber-900">Survey Data Quality Monitoring Analyser</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Implementing State */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-950 hidden md:inline whitespace-nowrap">
                Implementing State:
              </span>
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                className="text-xs font-semibold bg-amber-900 text-amber-50 border border-amber-700
                           rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-600 cursor-pointer"
              >
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-amber-950
                         hover:bg-amber-300/60 transition-colors"
            >
              {isFullscreen
                ? <Minimize2 className="w-4 h-4" />
                : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-950
                         hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200
                         border border-transparent hover:border-red-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
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
