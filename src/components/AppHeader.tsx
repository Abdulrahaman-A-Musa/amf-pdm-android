import React, { useState, useEffect } from 'react';
import {
  Shield, LogOut, GitCompare, CheckSquare,
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
    <header className="bg-[#33A6FD] sticky top-0 z-40 shadow-md">
      <div className="max-w-screen-2xl mx-auto px-4">
        {/* Top row */}
        <div className="flex items-center justify-between h-14 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shadow-md shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-white leading-tight">EHA-(AMF-PDM)</h1>
              <p className="text-xs text-white/80">Survey Data Quality Monitoring Analyser</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Implementing State */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white hidden md:inline whitespace-nowrap">
                Implementing State:
              </span>
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                className="text-xs font-semibold bg-[#1a85d4] text-white border border-[#1a85d4]
                           rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
              >
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white
                         hover:bg-white/20 transition-colors"
            >
              {isFullscreen
                ? <Minimize2 className="w-4 h-4" />
                : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white
                         hover:text-red-200 hover:bg-white/15 rounded-xl transition-all duration-200
                         border border-transparent hover:border-white/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Tab row */}
        <nav className="flex gap-1 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 transition-all duration-200 rounded-xl px-2 py-2 text-xs font-medium min-w-0 ${
                activeTab === tab.id
                  ? 'bg-white text-[#33A6FD] font-semibold'
                  : 'text-white/90 hover:bg-white/20'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
