/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DayEntry, WorkCategory, UserSettings, getCategoryDisplayName } from '../types';
import { detectDeviceLocation } from '../utils/deviceLocation';
import {
  calculateHours,
  calculateDayOvertime,
  isWeekend,
  getWeekdayName,
  getWeekNumber
} from '../utils/calculations';
import {
  Clock,
  Plus,
  Briefcase,
  Home as HomeIcon,
  CalendarDays,
  HeartPulse,
  Coffee,
  MapPin,
  Sparkles,
  AlertTriangle,
  Zap,
  CalendarCheck2,
  X
} from 'lucide-react';

interface QuickEntryProps {
  entries: DayEntry[];
  settings: UserSettings;
  onSaveEntry: (entry: DayEntry) => void;
  onBulkSaveEntries: (entries: DayEntry[]) => void;
}

function formatOrdinalDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = monthNames[monthIdx] || '';
  
  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) {
    suffix = 'st';
  } else if (day === 2 || day === 22) {
    suffix = 'nd';
  } else if (day === 3 || day === 23) {
    suffix = 'rd';
  }
  
  return `${day}${suffix} ${month} ${year}`;
}

export default function QuickEntry({
  entries,
  settings,
  onSaveEntry,
  onBulkSaveEntries
}: QuickEntryProps) {
  const deviceLocation = React.useMemo(() => detectDeviceLocation(), []);
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string>(todayStr);
  const [category, setCategory] = useState<WorkCategory>(WorkCategory.Office);
  const [entryTime, setEntryTime] = useState<string>('08:00');
  const [exitTime, setExitTime] = useState<string>('16:30');
  const [breakMinutes, setBreakMinutes] = useState<number>(30);
  const [location, setLocation] = useState<string>('');
  const [overriddenHours, setOverriddenHours] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Bulk Apply state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStart, setBulkStart] = useState<string>(todayStr);
  const [bulkEnd, setBulkEnd] = useState<string>(todayStr);
  const [bulkCategory, setBulkCategory] = useState<WorkCategory>(WorkCategory.Vacation);
  const [bulkNotes, setBulkNotes] = useState<string>('');

  // Toast notifications state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Auto-dismiss toast timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Get weekday check
  const isSelectedWeekend = isWeekend(date);

  // Active status of entered date
  const existingEntry = entries.find((e) => e.date === date);

  // Load existing details automatically if selected date changes
  useEffect(() => {
    if (existingEntry) {
      setCategory(existingEntry.category);
      setEntryTime(existingEntry.entryTime || '08:00');
      setExitTime(existingEntry.exitTime || '16:30');
      setBreakMinutes(existingEntry.breakMinutes ?? 30);
      setLocation(existingEntry.location || '');
      setOverriddenHours(existingEntry.overriddenTotalHours !== undefined ? String(existingEntry.overriddenTotalHours) : '');
      setNotes(existingEntry.notes || '');
    } else {
      setCategory(isWeekend(date) ? WorkCategory.Vacation : WorkCategory.Office);
      const locList = settings.differentOfficeLocations || [];
      setLocation(locList.length === 1 ? locList[0].name : '');
      setOverriddenHours('');
      setNotes('');
    }
  }, [date, existingEntry, settings.differentOfficeLocations]);

  // Auto-select first different office location if Different Office Location selected and field is empty
  useEffect(() => {
    if (category === WorkCategory.OtherOffice) {
      const locList = settings.differentOfficeLocations || [];
      if (locList.length > 0) {
        const exists = locList.some((loc) => loc.name === location);
        if (!exists) {
          setLocation(locList[0].name);
        }
      }
    }
  }, [category, settings.differentOfficeLocations, location]);

  // Calculations for current selection
  const calculatedHours = (category === WorkCategory.Office || category === WorkCategory.OtherOffice || category === WorkCategory.WFH)
    ? calculateHours(entryTime, exitTime, breakMinutes)
    : (category === WorkCategory.UnpaidFerie ? 0 : settings.standardWorkdayHours);

  const finalWorkingHours = overriddenHours && settings.enableManualOverride
    ? parseFloat(overriddenHours) || 0
    : calculatedHours;

  const standardHours = settings.standardWorkdayHours;
  const currentOvertime = calculateDayOvertime(category, finalWorkingHours, isSelectedWeekend, standardHours);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = d.getMonth() + 1;

    const entry: DayEntry = {
      date,
      weekday: getWeekdayName(date),
      weekNumber: getWeekNumber(date),
      month: mm,
      year: yyyy,
      category,
      entryTime: (category === WorkCategory.Office || category === WorkCategory.OtherOffice || category === WorkCategory.WFH) ? entryTime : undefined,
      exitTime: (category === WorkCategory.Office || category === WorkCategory.OtherOffice || category === WorkCategory.WFH) ? exitTime : undefined,
      breakMinutes: (category === WorkCategory.Office || category === WorkCategory.OtherOffice || category === WorkCategory.WFH) ? breakMinutes : undefined,
      location: (category === WorkCategory.OtherOffice) ? location : undefined,
      calculatedHours,
      overriddenTotalHours: overriddenHours !== '' ? parseFloat(overriddenHours) : undefined,
      finalCountedHours: finalWorkingHours,
      overtime: currentOvertime,
      notes,
      createdUpdatedTimestamp: new Date().toISOString()
    };

    onSaveEntry(entry);
    setToastMessage({
      text: `Daily log entry successfully saved for ${formatOrdinalDate(date)} ✅`,
      type: 'success'
    });
  };

  // Quick Action: Copy previous weekday entry (commits and pre-fills immediately)
  const handleCopyPreviousWeekday = () => {
    const sortedLoggedWeekdays = [...entries]
      .filter((e) => !isWeekend(e.date) && e.date < date)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (sortedLoggedWeekdays.length > 0) {
      const prev = sortedLoggedWeekdays[0];
      setCategory(prev.category);
      if (prev.entryTime) setEntryTime(prev.entryTime);
      if (prev.exitTime) setExitTime(prev.exitTime);
      if (prev.breakMinutes !== undefined) setBreakMinutes(prev.breakMinutes);
      setLocation(prev.location || '');
      setOverriddenHours(prev.overriddenTotalHours !== undefined ? String(prev.overriddenTotalHours) : '');
      setNotes(prev.notes || '');

      // Create and save entry immediately for direct logging
      const d = new Date(date);
      const mm = d.getMonth() + 1;
      const yyyy = d.getFullYear();

      // Recalculate working metric properties based on source values
      const calcHours = (prev.category === WorkCategory.Office || prev.category === WorkCategory.OtherOffice || prev.category === WorkCategory.WFH)
        ? calculateHours(prev.entryTime || '08:00', prev.exitTime || '16:30', prev.breakMinutes ?? 30)
        : (prev.category === WorkCategory.UnpaidFerie ? 0 : settings.standardWorkdayHours);

      const finalHrs = prev.overriddenTotalHours !== undefined ? prev.overriddenTotalHours : calcHours;
      const ot = calculateDayOvertime(prev.category, finalHrs, isWeekend(date), settings.standardWorkdayHours);

      const copiedEntry: DayEntry = {
        date,
        weekday: getWeekdayName(date),
        weekNumber: getWeekNumber(date),
        month: mm,
        year: yyyy,
        category: prev.category,
        entryTime: (prev.category === WorkCategory.Office || prev.category === WorkCategory.OtherOffice || prev.category === WorkCategory.WFH) ? prev.entryTime : undefined,
        exitTime: (prev.category === WorkCategory.Office || prev.category === WorkCategory.OtherOffice || prev.category === WorkCategory.WFH) ? prev.exitTime : undefined,
        breakMinutes: (prev.category === WorkCategory.Office || prev.category === WorkCategory.OtherOffice || prev.category === WorkCategory.WFH) ? prev.breakMinutes : undefined,
        location: (prev.category === WorkCategory.OtherOffice) ? prev.location : undefined,
        calculatedHours: calcHours,
        overriddenTotalHours: prev.overriddenTotalHours,
        finalCountedHours: finalHrs,
        overtime: ot,
        notes: prev.notes || `Copied from ${prev.date}`,
        createdUpdatedTimestamp: new Date().toISOString()
      };

      onSaveEntry(copiedEntry);
      setToastMessage({
        text: `Copied successfully! Logged ${prev.category.replace('Working ', '')} (${finalHrs.toFixed(2)} hrs) for ${formatOrdinalDate(date)} ✅`,
        type: 'success'
      });
    } else {
      setToastMessage({
        text: `No preceding weekday log exists to copy before ${formatOrdinalDate(date)}`,
        type: 'info'
      });
    }
  };

  // Quick Action: Use last office entry pattern (commits and pre-fills immediately)
  const handleUseLastOfficePattern = () => {
    const lastOffice = [...entries]
      .filter((e) => e.category === WorkCategory.Office)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    const targetCategory = WorkCategory.Office;
    const targetEntry = lastOffice?.entryTime || '08:00';
    const targetExit = lastOffice?.exitTime || '16:30';
    const targetBreak = lastOffice?.breakMinutes ?? 30;
    const targetNotes = 'Logged standard office hours';

    // Set interactive visual fields
    setCategory(targetCategory);
    setEntryTime(targetEntry);
    setExitTime(targetExit);
    setBreakMinutes(targetBreak);
    setOverriddenHours('');
    setNotes(targetNotes);

    // Create and save entry immediately
    const d = new Date(date);
    const mm = d.getMonth() + 1;
    const yyyy = d.getFullYear();

    const calcHours = calculateHours(targetEntry, targetExit, targetBreak);
    const ot = calculateDayOvertime(targetCategory, calcHours, isWeekend(date), settings.standardWorkdayHours);

    const standardOfficeEntry: DayEntry = {
      date,
      weekday: getWeekdayName(date),
      weekNumber: getWeekNumber(date),
      month: mm,
      year: yyyy,
      category: targetCategory,
      entryTime: targetEntry,
      exitTime: targetExit,
      breakMinutes: targetBreak,
      calculatedHours: calcHours,
      finalCountedHours: calcHours,
      overtime: ot,
      notes: targetNotes,
      createdUpdatedTimestamp: new Date().toISOString()
    };

    onSaveEntry(standardOfficeEntry);
    setToastMessage({
      text: `Default Office Hours logged successfully for ${formatOrdinalDate(date)} (${calcHours.toFixed(2)} hrs) ✅`,
      type: 'success'
    });
  };

  // Bulk fill current week with standards
  const handleQuickFillWeek = () => {
    const currDate = new Date(date);
    const dayOfWeek = currDate.getDay(); 
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(currDate);
    monday.setDate(monday.getDate() + diffToMonday);

    const weekEntries: DayEntry[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const tempDateStr = d.toISOString().split('T')[0];

      const exists = entries.find((e) => e.date === tempDateStr);
      if (exists) continue;

      const isHoliday = settings.holidays.find((h) => h.date === tempDateStr);
      const cat = isHoliday ? WorkCategory.Holiday : WorkCategory.Office;

      const calcH = cat === WorkCategory.Holiday ? settings.standardWorkdayHours : calculateHours('08:00', '16:30', 30);
      const ot = calculateDayOvertime(cat, calcH, false, settings.standardWorkdayHours);

      weekEntries.push({
        date: tempDateStr,
        weekday: getWeekdayName(tempDateStr),
        weekNumber: getWeekNumber(tempDateStr),
        month: d.getUTCMonth() + 1,
        year: d.getUTCFullYear(),
        category: cat,
        entryTime: cat === WorkCategory.Office ? '08:00' : undefined,
        exitTime: cat === WorkCategory.Office ? '16:30' : undefined,
        breakMinutes: cat === WorkCategory.Office ? 30 : undefined,
        calculatedHours: calcH,
        finalCountedHours: calcH,
        overtime: ot,
        notes: isHoliday ? `Quick-filled National holiday: ${isHoliday.name}` : 'Quick-filled weekday',
        createdUpdatedTimestamp: new Date().toISOString()
      });
    }

    if (weekEntries.length > 0) {
      onBulkSaveEntries(weekEntries);
      setToastMessage({
        text: `Logged ${weekEntries.length} weekdays successfully for current week ✅`,
        type: 'success'
      });
    } else {
      setToastMessage({
        text: 'All weekdays in the current week are already logged',
        type: 'info'
      });
    }
  };

  // Range bulk logging
  const handleBulkApplyRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkStart > bulkEnd) return;

    const start = new Date(bulkStart);
    const end = new Date(bulkEnd);
    const bulkList: DayEntry[] = [];

    const current = new Date(start);
    while (current <= end) {
      const dStr = current.toISOString().split('T')[0];
      const isWk = isWeekend(dStr);

      if (!isWk) {
        let calcH = 0;
        if (bulkCategory === WorkCategory.Office || bulkCategory === WorkCategory.OtherOffice) {
          calcH = calculateHours('08:00', '16:30', 30);
        } else if (
          bulkCategory === WorkCategory.WFH ||
          bulkCategory === WorkCategory.Holiday ||
          bulkCategory === WorkCategory.Vacation ||
          bulkCategory === WorkCategory.Sick
        ) {
          calcH = settings.standardWorkdayHours;
        } else {
          calcH = 0; 
        }

        const ot = calculateDayOvertime(bulkCategory, calcH, false, settings.standardWorkdayHours);

        bulkList.push({
          date: dStr,
          weekday: getWeekdayName(dStr),
          weekNumber: getWeekNumber(dStr),
          month: current.getUTCMonth() + 1,
          year: current.getUTCFullYear(),
          category: bulkCategory,
          entryTime: (bulkCategory === WorkCategory.Office) ? '08:00' : undefined,
          exitTime: (bulkCategory === WorkCategory.Office) ? '16:30' : undefined,
          breakMinutes: (bulkCategory === WorkCategory.Office) ? 30 : undefined,
          calculatedHours: calcH,
          finalCountedHours: calcH,
          overtime: ot,
          notes: bulkNotes || 'Bulk range entry',
          createdUpdatedTimestamp: new Date().toISOString()
        });
      }
      current.setDate(current.getDate() + 1);
    }

    if (bulkList.length > 0) {
      onBulkSaveEntries(bulkList);
      setShowBulkModal(false);
      setBulkNotes('');
      setToastMessage({
        text: `Successfully range-logged ${bulkList.length} weekdays for ${bulkCategory} ✅`,
        type: 'success'
      });
    }
  };

  // Warn if any empty weekday in the last 7 days
  const missingWeekdayEntries = (() => {
    const missing: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const past = new Date();
      past.setDate(today.getDate() - i);
      const pastStr = past.toISOString().split('T')[0];
      if (!isWeekend(pastStr)) {
        const found = entries.some((e) => e.date === pastStr);
        if (!found) {
          missing.push(pastStr);
        }
      }
    }
    return missing.sort();
  })();

  const getCategoryIcon = (cat: WorkCategory) => {
    switch (cat) {
      case WorkCategory.Office:
        return <Briefcase className="w-4 h-4" />;
      case WorkCategory.WFH:
        return <HomeIcon className="w-4 h-4" />;
      case WorkCategory.Holiday:
        return <CalendarCheck2 className="w-4 h-4" />;
      case WorkCategory.Vacation:
        return <CalendarDays className="w-4 h-4" />;
      case WorkCategory.Sick:
        return <HeartPulse className="w-4 h-4" />;
      case WorkCategory.UnpaidFerie:
        return <Coffee className="w-4 h-4" />;
      case WorkCategory.OtherOffice:
        return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="quick-entry-view-container">
      {/* Toast Feedback Banner (Floating at the top of the screen) */}
      {toastMessage && (
        <div 
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] px-5 py-4 rounded-xl border flex items-center gap-3 shadow-xl animate-fade-in font-sans text-xs transition-all"
          id="speed-fillers-toast-banner"
          style={{ 
            backgroundColor: '#3F4E4F', 
            color: '#DCD7C9',
            borderColor: '#DCD7C9',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.2)' 
          }}
        >
          <div className="flex-1 font-bold">{toastMessage.text}</div>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="font-bold shrink-0 text-sm cursor-pointer px-1.5 py-0.5 rounded-md transition-colors"
            style={{ color: '#DCD7C9', opacity: 0.8 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Amber warning banner when roundTripDistanceKm is empty or 0 */}
      {(settings.roundTripDistanceKm === '' || settings.roundTripDistanceKm === 0) && (
        <div className="bg-amber-50 border border-amber-200 text-slate-800 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in" id="commute-distance-quick-entry-warning">
          <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-amber-900 font-semibold leading-normal">
              Commute distance not set - SKAT deduction is currently 0. Go to Settings to enter your daily round-trip distance.
            </p>
          </div>
        </div>
      )}

      {/* Alert Banner for Unlogged Working Days */}
      {missingWeekdayEntries.length > 0 && (
        <div className="bg-amber-50 border border-brand-peach/35 text-slate-800 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in" id="unlogged-days-warning">
          <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-amber-900 text-sm">Unlogged Weekdays Detected</h4>
            <p className="text-xs text-slate-600 mt-1 leading-normal">
              You haven't logged entries for the following business days this week:{' '}
              {missingWeekdayEntries.map((d) => (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className="inline-block px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[11px] font-semibold font-mono mr-1.5 transition-colors"
                >
                  {d}
                </button>
              ))}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-brand-slate tracking-tight flex items-center gap-2">
                <Clock className="text-brand-blue" />
                <span>Daily Log Entry</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {existingEntry ? '✏️ Updating existing entry for this date' : '➕ Set category and hours worked below'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-slate-500 block">{getWeekdayName(date)}</span>
              <span className="text-xs font-semibold bg-brand-blue/10 text-brand-blue px-2.5 py-0.5 rounded font-mono">
                Week {getWeekNumber(date)}
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Date Pickers */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Selected Workday Date
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setDate(todayStr)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 rounded-xl transition font-semibold border border-slate-200 shrink-0 font-mono"
                >
                  TODAY
                </button>
              </div>
              {isSelectedWeekend && (
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> Note: This date falls on a weekend! Overtime rules differ.
                </p>
              )}
            </div>

            {/* Quick Action: Copy Prev. work day button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleCopyPreviousWeekday}
                className="w-full bg-slate-100 hover:bg-slate-200 text-brand-slate font-bold border border-slate-205 py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Copy Previous Workday</span>
              </button>
            </div>

            {/* Quick Category Grid */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                Attendance Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  WorkCategory.Office,
                  WorkCategory.WFH,
                  WorkCategory.Vacation,
                  WorkCategory.UnpaidFerie,
                  WorkCategory.Sick,
                  WorkCategory.Holiday,
                  WorkCategory.OtherOffice
                ].map((cat) => {
                  const isActive = category === cat;
                  const isOtherOffice = cat === WorkCategory.OtherOffice;
                  const displayName = getCategoryDisplayName(cat);
                  // Clean display name for the button label to match calendar legend exactly
                  let shortName = displayName;
                  if (cat === WorkCategory.Office) {
                    shortName = `Office (${settings.defaultOfficeLocationName || 'Default Office'})`;
                  }
                  else if (cat === WorkCategory.WFH) shortName = 'WFH';
                  else if (cat === WorkCategory.OtherOffice) shortName = 'Diff. Office Location';
                  else if (cat === WorkCategory.Vacation) shortName = 'Vacation';
                  else if (cat === WorkCategory.UnpaidFerie) shortName = 'Unpaid vacation';
                  else if (cat === WorkCategory.Sick) shortName = 'Sick day';
                  else if (cat === WorkCategory.Holiday) shortName = 'National holiday';

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isOtherOffice ? 'col-span-2' : ''
                      } ${
                        isActive
                          ? 'bg-brand-blue/10 border-brand-blue text-brand-blue shadow-sm scale-[1.01]'
                          : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`p-1 rounded-lg mb-1 ${isActive ? 'text-brand-blue' : 'text-slate-500'}`}>
                        {getCategoryIcon(cat)}
                      </span>
                      <span className="text-[10px] font-semibold leading-tight">{shortName}</span>
                    </button>
                  );
                })}
              </div>
            </div>



            {/* Hours input depending on category */}
            {(category === WorkCategory.Office || category === WorkCategory.OtherOffice || category === WorkCategory.WFH) ? (
              <div className="space-y-4 p-4 bg-slate-50/70 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase mb-1">Time Punch Metrics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Entry Time</label>
                    <input
                      type="time"
                      value={entryTime}
                      onChange={(e) => setEntryTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Exit Time</label>
                    <input
                      type="time"
                      value={exitTime}
                      onChange={(e) => setExitTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Break Duration (min)</label>
                    <input
                      type="number"
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue font-mono"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex border-t border-slate-200/85 pt-3 text-xs justify-between text-slate-500 items-center font-mono font-bold">
                  <span>Calculated hours working:</span>
                  <span className="text-slate-800 font-bold">{calculatedHours} hours</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Category standard credits:</span>
                  <span className="font-bold text-slate-800">
                    {category === WorkCategory.UnpaidFerie ? '0.0' : `${settings.standardWorkdayHours}`} hours
                  </span>
                </div>
                <p className="text-slate-500 text-[10px] leading-relaxed">
                  For remote or non-working settings, decimal work inputs are computed automatically using standard schedules.
                </p>
              </div>
            )}

            {/* Dropdown for different office locations */}
            {category === WorkCategory.OtherOffice && (
              <div className="p-4 bg-indigo-50/75 border border-indigo-200 rounded-xl space-y-2 animate-fade-in" id="different-office-location-dropdown-tile">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    Select Office Location <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[9px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-semibold">Configured in Settings</span>
                </div>
                {settings.differentOfficeLocations && settings.differentOfficeLocations.length > 0 ? (
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white border border-indigo-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    required
                  >
                    {location === '' && <option value="" disabled>-- Select a location --</option>}
                    {settings.differentOfficeLocations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name} ({loc.roundTripDistanceKm} km round trip {loc.includeInCommute ? '• Commute' : '• No commute'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder={`e.g. ${deviceLocation.majorCities.slice(0, 3).join(', ')}`}
                        className="w-full bg-white border border-indigo-200 rounded-lg pl-3 pr-8 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        required
                      />
                      {location && (
                        <button
                          type="button"
                          onClick={() => setLocation('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-200/50 cursor-pointer flex items-center justify-center"
                          title="Clear location"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-indigo-700/80">
                      No different office locations registered in Settings. Type custom location or add them in the Settings page.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Optional Manual Override */}
            {settings.enableManualOverride && (
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Manual Override (Optional)
                  </label>
                  <span className="text-[9px] text-slate-500 bg-slate-200 px-2 py-0.5 rounded font-semibold">Enabled in Settings</span>
                </div>
                <input
                  type="number"
                  step="0.05"
                  placeholder={`Override worked hours (Calculated: ${calculatedHours})`}
                  value={overriddenHours}
                  onChange={(e) => setOverriddenHours(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 font-mono"
                  min="0"
                  max="24"
                />
                <p className="text-[10px] text-slate-400 leading-snug">
                  If filled, we bypass calculated values and record this as the total worked hours.
                  </p>
              </div>
            )}

            {/* Notes Section */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Workday Notes / Task Reminders
              </label>
              <div className="relative">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Examples: Aarhus client call, deployment release, tooth treatment, holiday, focus on backend docs."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 min-h-[70px]"
                />
                {notes && (
                  <button
                    type="button"
                    onClick={() => setNotes('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-200/50 cursor-pointer flex items-center justify-center"
                    title="Clear notes"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scoreboard Metrics */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Expected Standard
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {isSelectedWeekend ? '0.0 (Weekend)' : `${settings.standardWorkdayHours} hrs`}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="space-y-0.5 text-center">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Counted Work
                </span>
                <span className="text-xs font-extrabold text-brand-slate font-mono">
                  {finalWorkingHours.toFixed(1)} hrs
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="space-y-0.5 text-right">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Overtime impact
                </span>
                <span className={`text-xs font-bold font-mono ${
                  currentOvertime > 0
                    ? 'text-brand-green font-bold'
                    : currentOvertime < 0
                    ? 'text-rose-500'
                    : 'text-slate-500'
                }`}>
                  {currentOvertime >= 0 ? `+${currentOvertime.toFixed(1)}` : `${currentOvertime.toFixed(1)}`} hrs
                </span>
              </div>
            </div>

            <button
              id="submit-day-entry-btn"
              type="submit"
              className="w-full bg-brand-blue hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-md text-xs flex items-center justify-center gap-2 border border-brand-blue cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{existingEntry ? 'Save and Update Entry' : 'Log Daily Entry'}</span>
            </button>
          </form>
        </div>

        {/* Sidebar Actions Column */}
        <div className="space-y-6">
          {/* Quick Copy Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-brand-slate flex items-center gap-2">
              <Zap className="text-amber-500 w-4 h-4" />
              <span>Smart Speed Fillers</span>
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Expedite repeated schedules or log a whole week of work with a single click.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleUseLastOfficePattern}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left p-3 rounded-xl transition text-xs text-slate-700 flex items-center justify-between cursor-pointer"
              >
                <div className="space-y-0.5">
                  <span className="font-semibold block text-slate-800">Default Office Hours</span>
                  <span className="text-[9px] text-slate-400 block font-normal">Fill 08:00 - 16:30 office day</span>
                </div>
                <span className="text-emerald-700 text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded font-mono font-bold">
                  08:00
                </span>
              </button>

              <button
                type="button"
                onClick={handleQuickFillWeek}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left p-3 rounded-xl transition text-xs text-slate-700 flex items-center justify-between cursor-pointer"
              >
                <div className="space-y-0.5">
                  <span className="font-semibold block text-slate-800">Quick-Fill Current Week</span>
                  <span className="text-[9px] text-slate-400 block font-normal">Bypasses weekends; logs office</span>
                </div>
                <span className="text-brand-blue text-[9px] bg-brand-blue/10 px-2 py-0.5 rounded font-mono font-bold">
                  WEEK
                </span>
              </button>
            </div>
          </div>

          {/* Bulk Range Action */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-brand-slate flex items-center gap-2">
              <CalendarDays className="text-brand-blue w-4 h-4" />
              <span>Bulk Vacation / Remote</span>
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Away on vacation or taking a parental block? Log multiple business days instantly.
            </p>
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="w-full bg-brand-blue/10 hover:bg-brand-blue/15 text-brand-blue font-bold border border-brand-blue/20 py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              Open Bulk Apply Tool
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Apply Modal Dialog */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-brand-slate text-base">Bulk Apply Workday Category</h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm hover:bg-slate-100 px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkApplyRange} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={bulkStart}
                    onChange={(e) => setBulkStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={bulkEnd}
                    onChange={(e) => setBulkEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Select Category</label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value as WorkCategory)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                >
                  {Object.values(WorkCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace('Working ', '')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Notes (Optional)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Summer vacation Block, Sick spell"
                    value={bulkNotes}
                    onChange={(e) => setBulkNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-8 py-2 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                  {bulkNotes && (
                    <button
                      type="button"
                      onClick={() => setBulkNotes('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-200/50 cursor-pointer flex items-center justify-center"
                      title="Clear notes"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-brand-peach/20 text-[11px] text-slate-700 leading-relaxed space-y-1">
                <span className="font-bold text-amber-800 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Weekend Filter Applied
                </span>
                <span>This range will bypass weekends which reduces unwanted logs. Standard weekdays will be logged at 100% capacity.</span>
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-blue hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg"
                >
                  Apply to Days
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
