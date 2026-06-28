/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { DayEntry, WorkCategory, UserSettings } from './types';
import { generateSeedData } from './utils/calculations';
import { getDanishHolidays } from './utils/holidays';
import { getDanfossEntries } from './utils/danfossData';

// Subcomponents
import QuickEntry from './components/QuickEntry';
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
import EntriesView from './components/EntriesView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import PitchView from './components/PitchView';

// Icons
import {
  Clock,
  LayoutDashboard,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  Sliders,
  ChevronRight,
  Menu,
  X,
  HelpCircle,
  Briefcase,
  Sparkles
} from 'lucide-react';

export function WorkLedgerLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <path 
        d="M12 2L2 7V17L12 22L22 17V7L12 2Z" 
        fill="url(#logoGrad)" 
        className="opacity-95" 
      />
      <path 
        d="M8 9H16M8 13H13" 
        stroke="white" 
        strokeWidth="1.8" 
        strokeLinecap="round" 
        className="opacity-90"
      />
      <path 
        d="M13.5 13.5L15.5 15.5L19.5 11" 
        stroke="#10B981" 
        strokeWidth="2.2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}

const ENTRIES_CACHE_KEY = 'danish_tracker_workday_entries';
const SETTINGS_CACHE_KEY = 'danish_tracker_workday_settings';

export default function App() {
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'calendar' | 'entries' | 'reports' | 'settings' | 'pitch'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // First boot state populating
  useEffect(() => {
    const loadCachedData = async () => {
      // 1. Load or default settings
      const { value: cachedSettings } = await Preferences.get({ key: SETTINGS_CACHE_KEY });
      let finalSettings: UserSettings;

      if (cachedSettings) {
        try {
          finalSettings = JSON.parse(cachedSettings);
        } catch (err) {
          finalSettings = getDefaultSettings();
        }
      } else {
        finalSettings = getDefaultSettings();
      }

      // 2. Load or seed entries
      const { value: cachedEntries } = await Preferences.get({ key: ENTRIES_CACHE_KEY });
      let finalEntries: DayEntry[] = [];

      const getFullSeededEntries = (stdHours: number) => {
        const danfoss = getDanfossEntries();
        const synthetic2026 = generateSeedData(stdHours);
        return [...danfoss, ...synthetic2026].sort((a, b) => b.date.localeCompare(a.date));
      };

      if (cachedEntries) {
        try {
          finalEntries = JSON.parse(cachedEntries);
        } catch (err) {
          finalEntries = getFullSeededEntries(finalSettings.standardWorkdayHours);
        }
      } else {
        // Prompt seeded defaults
        finalEntries = getFullSeededEntries(finalSettings.standardWorkdayHours);
      }

      setSettings(finalSettings);
      setEntries(finalEntries);

      // Save states if empty
      if (!cachedSettings) {
        await Preferences.set({ key: SETTINGS_CACHE_KEY, value: JSON.stringify(finalSettings) });
      }
      if (!cachedEntries) {
        await Preferences.set({ key: ENTRIES_CACHE_KEY, value: JSON.stringify(finalEntries) });
      }
    };

    loadCachedData();
  }, []);

  // Enforce the unified premium color theme across all devices
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
  }, []);

  const getDefaultSettings = (): UserSettings => {
    const defaultHolidays = getDanishHolidays(2026);
    return {
      standardWorkdayHours: 7.4,
      roundTripDistanceKm: '',
      userName: 'Rohan Patil',
      activeCompany: 'Danfoss Power Electronics A/S',
      companies: ['Danfoss Power Electronics A/S', 'Danfoss Climate Solutions', 'Danfoss Drives'],
      theme: 'system',
      taxRates: [
        { year: 2026, thresholdKm: 24, rate1: 2.28, rate2: 1.14, limitKm: 120 },
        { year: 2025, thresholdKm: 24, rate1: 2.23, rate2: 1.12, limitKm: 120 }
      ],
      categoryColors: {
        [WorkCategory.Office]: 'bg-brand-blue text-white',
        [WorkCategory.WFH]: 'bg-teal-600 text-white',
        [WorkCategory.Holiday]: 'bg-red-500 text-white',
        [WorkCategory.Vacation]: 'bg-brand-green text-white',
        [WorkCategory.Sick]: 'bg-brand-peach text-white/95',
        [WorkCategory.UnpaidFerie]: 'bg-slate-450 text-white',
        [WorkCategory.OtherOffice]: 'bg-indigo-500 text-white'
      } as any,
      holidays: defaultHolidays,
      overtimeCreditRules: {
        [WorkCategory.Office]: 'earned',
        [WorkCategory.WFH]: 'earned',
        [WorkCategory.OtherOffice]: 'earned',
        [WorkCategory.Holiday]: 'standard',
        [WorkCategory.Vacation]: 'standard',
        [WorkCategory.Sick]: 'standard',
        [WorkCategory.UnpaidFerie]: 'zero'
      },
      enableManualOverride: true,
      preferredYearView: 2026,
      differentOfficeLocations: [
        { id: 'loc-b', name: 'Aarhus Office', roundTripDistanceKm: 60, includeInCommute: true },
        { id: 'loc-remote', name: 'Odense Remote Office', roundTripDistanceKm: 0, includeInCommute: false }
      ],
      defaultOfficeLocationName: ''
    };
  };

  // --- COMPONENT ACTION DISPATCHERS ---

  const handleSaveEntry = async (updatedEntry: DayEntry) => {
    const existingIdx = entries.findIndex((e) => e.date === updatedEntry.date);
    let nextEntries = [...entries];
    if (existingIdx >= 0) {
      nextEntries[existingIdx] = updatedEntry;
    } else {
      nextEntries.push(updatedEntry);
    }
    nextEntries.sort((a, b) => b.date.localeCompare(a.date));
    setEntries(nextEntries);
    await Preferences.set({ key: ENTRIES_CACHE_KEY, value: JSON.stringify(nextEntries) });
  };

  const handleBulkSaveEntries = async (bulkList: DayEntry[]) => {
    let nextEntries = [...entries];
    bulkList.forEach((newE) => {
      const idx = nextEntries.findIndex((e) => e.date === newE.date);
      if (idx >= 0) {
        nextEntries[idx] = newE; // overwrite duplicate
      } else {
        nextEntries.push(newE);
      }
    });
    nextEntries.sort((a, b) => b.date.localeCompare(a.date));
    setEntries(nextEntries);
    await Preferences.set({ key: ENTRIES_CACHE_KEY, value: JSON.stringify(nextEntries) });
  };

  const handleDeleteEntry = async (dateToDelete: string) => {
    const filtered = entries.filter((e) => e.date !== dateToDelete);
    setEntries(filtered);
    await Preferences.set({ key: ENTRIES_CACHE_KEY, value: JSON.stringify(filtered) });
  };

  const handleUpdateSettings = async (updatedSettings: UserSettings) => {
    setSettings(updatedSettings);
    await Preferences.set({ key: SETTINGS_CACHE_KEY, value: JSON.stringify(updatedSettings) });
  };

  const handleClearAndReseed = async () => {
    if (!settings) return;
    const danfoss = getDanfossEntries();
    const synthetic2026 = generateSeedData(settings.standardWorkdayHours);
    const seeded = [...danfoss, ...synthetic2026].sort((a, b) => b.date.localeCompare(a.date));
    setEntries(seeded);
    await Preferences.set({ key: ENTRIES_CACHE_KEY, value: JSON.stringify(seeded) });
  };

  // Render Loader if first-time load pending
  if (!settings) {
    return (
      <div className="min-h-screen bg-brand-bg text-slate-800 flex items-center justify-center p-6 font-sans">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-semibold tracking-wide">Initialising WorkLedger data...</p>
        </div>
      </div>
    );
  }

  // Active view content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <QuickEntry
            entries={entries}
            settings={settings}
            onSaveEntry={handleSaveEntry}
            onBulkSaveEntries={handleBulkSaveEntries}
          />
        );
      case 'dashboard':
        return <DashboardView entries={entries} settings={settings} />;
      case 'calendar':
        return (
          <CalendarView
            entries={entries}
            settings={settings}
            onSaveEntry={handleSaveEntry}
            onDeleteEntry={handleDeleteEntry}
          />
        );
      case 'entries':
        return (
          <EntriesView
            entries={entries}
            settings={settings}
            onSaveEntry={handleSaveEntry}
            onDeleteEntry={handleDeleteEntry}
          />
        );
      case 'reports':
        return <ReportsView entries={entries} settings={settings} />;
      case 'settings':
        return (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onClearAndReseed={handleClearAndReseed}
          />
        );
      case 'pitch':
        return <PitchView onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  const menuItems = [
    { id: 'home', label: 'Quick Entry / Home', icon: Clock },
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'calendar', label: 'Interactive Calendar', icon: CalendarDays },
    { id: 'entries', label: 'Historical Working Logs', icon: FileSpreadsheet },
    { id: 'reports', label: 'Tax & PDF Reports', icon: FileText },
    { id: 'settings', label: 'Workday Settings', icon: Sliders },
    { id: 'pitch', label: 'Share & Tester Guide', icon: Sparkles }
  ] as const;

  const currentSectionLabel = menuItems.find(item => item.id === activeTab)?.label || 'Quick Entry / Home';

  return (
    <div className="min-h-screen bg-brand-bg text-slate-800 flex flex-col md:flex-row font-sans selection:bg-brand-blue selection:text-white" id="main-application-container">
      
      {/* Mobile Top Header (hidden on desktop) */}
      <div className="md:hidden bg-brand-slate border-b border-brand-slate p-4 flex justify-between items-center z-30 print:hidden shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-lg bg-slate-800 border border-slate-700/60 shadow-inner">
            <WorkLedgerLogo className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white block">WorkLedger — {currentSectionLabel}</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className="text-slate-300 hover:text-white p-1 rounded-lg border border-slate-700 font-semibold"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sidebar Drawer */}
      <aside className={`w-full md:w-64 bg-brand-slate flex flex-col z-20 shrink-0 print:hidden ${
        mobileMenuOpen ? 'block' : 'hidden md:flex'
      }`}>
        {/* Brand identity */}
        <div className="hidden md:flex items-center gap-2.5 px-6 py-6 border-b border-slate-700/65">
          <div className="p-1.5 rounded-xl bg-slate-800 border border-slate-700/60 shadow-lg">
            <WorkLedgerLogo className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-base block">WorkLedger</span>
            <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">Workday Tracker</span>
          </div>
        </div>

        {/* Sidebar Navigation items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/10 scale-[1.01]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
              </button>
            );
          })}
        </nav>

         {/* User identification footer */}
         <div className="p-4 border-t border-slate-700/65 bg-black/10 text-xs text-slate-400">
           <div className="flex items-center gap-2.5 mb-2.5">
             <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center font-extrabold text-white border border-blue-400/20 font-mono text-xs shadow-sm">
               {(settings.userName || 'Rohan Patil').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
             </div>
             <div className="truncate flex-1">
               <span className="font-bold text-white block select-none truncate" title={settings.userName || 'Rohan Patil'}>
                 {settings.userName || 'Rohan Patil'}
               </span>
               <span className="text-[10px] text-slate-300 font-semibold block truncate" title={settings.activeCompany || 'Danfoss Power Electronics A/S'}>
                 {settings.activeCompany || 'Danfoss Power Electronics A/S'}
               </span>
             </div>
           </div>
           <div className="text-[9px] font-mono font-medium text-slate-400 border-t border-slate-700/40 pt-2 text-center select-none tracking-tight">
             © 2026 Rohan Patil. All Rights Reserved.
           </div>
         </div>
      </aside>

      {/* Main layout contents area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:p-8 container mx-auto pr-4 print:p-0 print:bg-white print:text-black">
        {/* Dynamic component routing view */}
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Breadcrumb Header for Desktop */}
          <div className="sticky top-[-2rem] bg-brand-bg pt-8 pb-3.5 z-10 hidden md:flex justify-between items-center border-b border-slate-200 mb-2 print:hidden">
            <h2 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center">
              <span className="text-slate-500 font-semibold mr-1.5">WorkLedger</span>
              <span className="text-slate-400 font-normal mr-1.5">-</span>
              <span className="text-brand-blue font-bold">{currentSectionLabel}</span>
            </h2>
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200">ACTIVE TAX RECORD</span>
          </div>
          {renderTabContent()}
        </div>
      </main>

    </div>
  );
}
