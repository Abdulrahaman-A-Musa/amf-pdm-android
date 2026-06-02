import { create } from 'zustand';
import { DataRow, ValidationRow, TabId } from '../types';

interface AppStore {
  isLoggedIn: boolean;
  activeTab: TabId;
  mainData: DataRow[] | null;
  revisitData: DataRow[] | null;
  qualityData: DataRow[] | null;
  validationData: ValidationRow[] | null;
  isProcessing: boolean;

  login: () => void;
  logout: () => void;
  setActiveTab: (tab: TabId) => void;
  setMainData: (data: DataRow[] | null) => void;
  setRevisitData: (data: DataRow[] | null) => void;
  setQualityData: (data: DataRow[] | null) => void;
  setValidationData: (data: ValidationRow[] | null) => void;
  setProcessing: (val: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  isLoggedIn: false,
  activeTab: 'comparison',
  mainData: null,
  revisitData: null,
  qualityData: null,
  validationData: null,
  isProcessing: false,

  login: () => set({ isLoggedIn: true }),
  logout: () =>
    set({
      isLoggedIn: false,
      mainData: null,
      revisitData: null,
      qualityData: null,
      validationData: null,
    }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setMainData: (data) => set({ mainData: data }),
  setRevisitData: (data) => set({ revisitData: data }),
  setQualityData: (data) => set({ qualityData: data }),
  setValidationData: (data) => set({ validationData: data }),
  setProcessing: (val) => set({ isProcessing: val }),
}));
