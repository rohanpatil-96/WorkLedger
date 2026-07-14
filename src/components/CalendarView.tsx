/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DayEntry, WorkCategory, UserSettings, getCategoryDisplayName } from '../types';
import { isWeekend, getWeekdayName, getWeekNumber, calculateDayOvertime } from '../utils/calculations';
import { getDanishHolidays, formatDateISO } from '../utils/holidays';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  CalendarCheck,
  AlertCircle,
  PlusCircle,
  Briefcase,
  Home as HomeIcon,
  HelpCircle,
  AlertTriangle,
  X
} from 'lucide-react';

interface CalendarViewProps {
  entries: DayEntry[];
  settings: UserSettings;
  onSaveEntry: (entry: DayEntry) => void;
  onDeleteEntry: (date: string) => void;
}

export default function CalendarView({
  entries,
  settings,
  onSaveEntry,
  onDeleteEntry
}: CalendarViewProps) {
  const currentLocalTime = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentLocalTime.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentLocalTime.getMonth() + 1);
  const [showWeekends, setShowWeekends] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const todayStr = formatDateISO(new Date());

  const getCompactCategoryLabel = (cat: WorkCategory) => {
    switch (cat) {
      case WorkCategory.Office:
        return 'OFFICE';
      case WorkCategory.WFH:
        return 'HOME';
      case WorkCategory.Holiday:
        return 'HOLIDAY';
      case WorkCategory.Vacation:
        return 'VACATION';
      case WorkCategory.Sick:
        return 'SICK';
      case WorkCategory.UnpaidFerie:
        return 'UNPAID';
      case WorkCategory.OtherOffice:
        return isMobile ? 'OTHER LOC' : 'OTHER OFFICE';
      default:
        return String(cat);
    }
  };

  // Modal State for Quick Popup Editing
  const [editingDay, setEditingDay] = useState<{ dateStr: string; entry?: DayEntry } | null>(null);
  const [editCategory, setEditCategory] = useState<WorkCategory>(WorkCategory.Office);
  const [editEntryTime, setEditEntryTime] = useState('08:00');
  const [editExitTime, setEditExitTime] = useState('16:30');
  const [editBreak, setEditBreak] = useState(30);
  const [editOverride, setEditOverride] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editIsBridgeDayTaken, setEditIsBridgeDayTaken] = useState(false);
  const [editIsFeriefridag, setEditIsFeriefridag] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Public holidays map for the selected year
  const danishHolidays = getDanishHolidays(selectedYear);
  const holidaysMap = new Map<string, string>();
  danishHolidays.forEach((h) => {
    holidaysMap.set(h.date, h.name);
  });

  // Find holidays in the selected month
  const monthHolidays = danishHolidays.filter((h) => {
    const parts = h.date.split('-');
    return parseInt(parts[1], 10) === selectedMonth;
  });

  // Calculate bridge opportunities in the selected month
  const monthBridgeDays = React.useMemo(() => {
    const list: { date: string; holidayName: string; type: 'Friday' | 'Monday'; weekNum: number }[] = [];
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(selectedMonth).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${selectedYear}-${mm}-${dd}`;
      
      // If it's already a weekend or national holiday, skip
      if (isWeekend(dateStr) || holidaysMap.has(dateStr)) {
        continue;
      }
      
      const dObj = new Date(Date.UTC(selectedYear, selectedMonth - 1, day));
      const dayOfWeek = dObj.getUTCDay(); // 0 Sunday, 1 Monday, 5 Friday
      const weekNum = getWeekNumber(dateStr);
      
      if (dayOfWeek === 5) { // Friday
        // Check if Thursday is a holiday
        const prevDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, day - 1));
        const prevStr = formatDateISO(prevDate);
        if (holidaysMap.has(prevStr)) {
          list.push({
            date: dateStr,
            holidayName: holidaysMap.get(prevStr) || '',
            type: 'Friday',
            weekNum
          });
        }
      } else if (dayOfWeek === 1) { // Monday
        // Check if Tuesday is a holiday
        const nextDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, day + 1));
        const nextStr = formatDateISO(nextDate);
        if (holidaysMap.has(nextStr)) {
          list.push({
            date: dateStr,
            holidayName: holidaysMap.get(nextStr) || '',
            type: 'Monday',
            weekNum
          });
        }
      }
    }
    return list;
  }, [selectedYear, selectedMonth, holidaysMap]);

  // Generate weeks for the calendar view dynamically and UTC-safely
  const calendarWeeks = React.useMemo(() => {
    const list: { weekNumber: number; days: { dateStr: string; dayNum: number | null }[] }[] = [];
    
    // Create first day of month in UTC to avoid local timezone offsets
    const firstDay = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
    const startOffset = (firstDay.getUTCDay() + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
    
    // Find first Monday in UTC
    const currentMonday = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1 - startOffset));
    
    while (true) {
      const mondayMonth = currentMonday.getUTCMonth() + 1;
      const mondayYear = currentMonday.getUTCFullYear();
      
      // Stop if currentMonday has moved completely past the selected month/year
      if (mondayYear > selectedYear || (mondayYear === selectedYear && mondayMonth > selectedMonth)) {
        break;
      }
      
      const mondayStr = formatDateISO(currentMonday);
      const weekNum = getWeekNumber(mondayStr);
      
      const daysOfThisWeek: { dateStr: string; dayNum: number | null }[] = [];
      
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(currentMonday.getTime());
        dayDate.setUTCDate(dayDate.getUTCDate() + i);
        
        const dMonth = dayDate.getUTCMonth() + 1;
        const dYear = dayDate.getUTCFullYear();
        const dNum = dayDate.getUTCDate();
        const dStr = formatDateISO(dayDate);
        
        if (dMonth === selectedMonth && dYear === selectedYear) {
          daysOfThisWeek.push({ dateStr: dStr, dayNum: dNum });
        } else {
          daysOfThisWeek.push({ dateStr: dStr, dayNum: null });
        }
      }
      
      const daysFiltered = showWeekends ? daysOfThisWeek : daysOfThisWeek.slice(0, 5);
      
      if (daysFiltered.some(d => d.dayNum !== null)) {
        list.push({
          weekNumber: weekNum,
          days: daysFiltered
        });
      }
      
      currentMonday.setUTCDate(currentMonday.getUTCDate() + 7);
    }
    
    return list;
  }, [selectedYear, selectedMonth, showWeekends]);

  // Navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleDayClick = (dateStr: string) => {
    setShowDeleteConfirm(false);
    const existing = entries.find((e) => e.date === dateStr);
    setEditingDay({ dateStr, entry: existing });

    if (existing) {
      setEditCategory(existing.category);
      setEditEntryTime(existing.entryTime || '08:00');
      setEditExitTime(existing.exitTime || '16:30');
      setEditBreak(existing.breakMinutes ?? 30);
      setEditOverride(existing.overriddenTotalHours !== undefined ? String(existing.overriddenTotalHours) : '');
      setEditNotes(existing.notes || '');
      setEditLocation(existing.location || '');
      setEditIsBridgeDayTaken(existing.isBridgeDayTaken || false);
      setEditIsFeriefridag(!!existing.isFeriefridag);
    } else {
      const isHoli = holidaysMap.has(dateStr);
      setEditCategory(isWeekend(dateStr) ? (isHoli ? WorkCategory.Holiday : WorkCategory.Vacation) : (isHoli ? WorkCategory.Holiday : WorkCategory.Office));
      setEditEntryTime('08:00');
      setEditExitTime('16:30');
      setEditBreak(30);
      setEditOverride('');
      setEditNotes(isHoli ? `Public Holiday: ${holidaysMap.get(dateStr)}` : '');
      setEditLocation('');
      setEditIsBridgeDayTaken(false);
      setEditIsFeriefridag(false);
    }
  };

  const handleModalSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay) return;

    const { dateStr } = editingDay;
    const parts = dateStr.split('-');
    const yyyy = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    const isWk = isWeekend(dateStr);

    let calculatedHours = 0;
    if (
      editCategory === WorkCategory.Office ||
      editCategory === WorkCategory.OtherOffice ||
      editCategory === WorkCategory.WFH
    ) {
      const parseHours = (entry: string, exit: string, brk: number) => {
        const parts1 = entry.split(':');
        const parts2 = exit.split(':');
        if (parts1.length !== 2 || parts2.length !== 2) return 0;
        const entryMin = parseInt(parts1[0], 10) * 60 + parseInt(parts1[1], 10);
        const exitMin = parseInt(parts2[0], 10) * 60 + parseInt(parts2[1], 10);
        const total = exitMin - entryMin - brk;
        return parseFloat((total / 60).toFixed(2));
      };
      calculatedHours = parseHours(editEntryTime, editExitTime, editBreak);
    } else if (editCategory === WorkCategory.UnpaidFerie) {
      calculatedHours = 0;
    } else {
      calculatedHours = settings.standardWorkdayHours;
    }

    const finalHours = editOverride && settings.enableManualOverride
      ? parseFloat(editOverride) || 0
      : calculatedHours;

    const ot = calculateDayOvertime(editCategory, finalHours, isWk, settings.standardWorkdayHours);

    const isBridgeTaken = editCategory === WorkCategory.Vacation &&
      monthBridgeDays.some((b) => b.date === dateStr) &&
      editIsBridgeDayTaken;

    const updatedEntry: DayEntry = {
      date: dateStr,
      weekday: getWeekdayName(dateStr),
      weekNumber: getWeekNumber(dateStr),
      month: mm,
      year: yyyy,
      category: editCategory,
      entryTime: (editCategory === WorkCategory.Office || editCategory === WorkCategory.OtherOffice || editCategory === WorkCategory.WFH) ? editEntryTime : undefined,
      exitTime: (editCategory === WorkCategory.Office || editCategory === WorkCategory.OtherOffice || editCategory === WorkCategory.WFH) ? editExitTime : undefined,
      breakMinutes: (editCategory === WorkCategory.Office || editCategory === WorkCategory.OtherOffice || editCategory === WorkCategory.WFH) ? editBreak : undefined,
      calculatedHours,
      overriddenTotalHours: editOverride !== '' ? parseFloat(editOverride) : undefined,
      finalCountedHours: finalHours,
      overtime: ot,
      notes: editNotes,
      location: editCategory === WorkCategory.OtherOffice ? editLocation : undefined,
      isBridgeDayTaken: isBridgeTaken ? true : undefined,
      isFeriefridag: editCategory === WorkCategory.Vacation ? editIsFeriefridag : undefined,
      createdUpdatedTimestamp: new Date().toISOString()
    };

    onSaveEntry(updatedEntry);
    setEditingDay(null);
  };

  const getCategoryThemeClass = (cat: WorkCategory) => {
    switch (cat) {
      case WorkCategory.Office:
        return 'bg-brand-blue/10 text-brand-blue border-brand-blue/30 hover:bg-brand-blue/15';
      case WorkCategory.WFH:
        return 'bg-teal-500/10 text-teal-700 border-teal-500/30 hover:bg-teal-500/15';
      case WorkCategory.Holiday:
        return 'bg-rose-500/10 text-rose-700 border-rose-500/25 hover:bg-rose-500/15';
      case WorkCategory.Vacation:
        return 'bg-brand-green/10 text-emerald-800 border-brand-green/25 hover:bg-brand-green/15';
      case WorkCategory.Sick:
        return 'bg-purple-500/10 text-purple-800 border-purple-500/25 hover:bg-purple-500/15';
      case WorkCategory.UnpaidFerie:
        return 'bg-slate-100 text-slate-700 border-slate-205 hover:bg-slate-200/50';
      case WorkCategory.OtherOffice:
        return 'bg-indigo-500/10 text-indigo-700 border-indigo-500/25 hover:bg-indigo-500/15';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="calendar-interactive-grid-view">
      {/* Calendar Header with Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-slate-200 p-4 rounded-2xl gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold text-brand-slate min-w-[160px] text-center tracking-tight">
            {monthsList[selectedMonth - 1]} {selectedYear}
          </h3>
          <button
            onClick={handleNextMonth}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap justify-center sm:justify-end">
          <button
            onClick={() => setShowWeekends(!showWeekends)}
            className={`border px-3.5 py-2 rounded-xl transition cursor-pointer text-xs font-semibold ${
              showWeekends
                ? 'bg-amber-50 border-amber-200 text-amber-700 font-bold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {showWeekends ? 'Hide Weekends' : 'Show Weekends'}
          </button>
          <button
            onClick={() => {
              setSelectedYear(currentLocalTime.getFullYear());
              setSelectedMonth(currentLocalTime.getMonth() + 1);
            }}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Go to Today
          </button>
          <div className="flex bg-slate-50 p-1 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500">
            <span className="px-2 py-0.5 font-mono">{monthsList[selectedMonth - 1].toUpperCase()} {selectedYear} ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Weekdays Grid Headers */}
      <div 
        className="grid gap-1 md:gap-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500 font-sans border-b border-slate-100 pb-2"
        style={{ gridTemplateColumns: isMobile ? (showWeekends ? 'repeat(7, 1fr)' : 'repeat(5, 1fr)') : (showWeekends ? '48px repeat(7, 1fr)' : '48px repeat(5, 1fr)') }}
      >
            <div className="hidden md:flex text-slate-400 font-mono text-[10px] items-center justify-center">Wk</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            {showWeekends && <div className="text-amber-600">Sat</div>}
            {showWeekends && <div className="text-amber-600">Sun</div>}
          </div>

          {/* Calendar Grid cells */}
          <div 
            className="grid gap-1 md:gap-2" 
            id="calendar-month-squares-grid"
            style={{ gridTemplateColumns: isMobile ? (showWeekends ? 'repeat(7, 1fr)' : 'repeat(5, 1fr)') : (showWeekends ? '48px repeat(7, 1fr)' : '48px repeat(5, 1fr)') }}
          >
            {calendarWeeks.map((week) => (
              <React.Fragment key={week.weekNumber}>
                {/* Week Number Cell */}
                <div 
                  className="hidden md:flex flex-col items-center justify-center bg-slate-50 border border-slate-200/60 rounded-2xl min-h-[105px] font-mono text-[11px] text-slate-400 font-bold select-none shadow-xs" 
                  title={`Week ${week.weekNumber}`}
                >
                  <span className="text-[9px] text-slate-300 uppercase tracking-tight font-sans">Week</span>
                  <span className="text-slate-500 text-xs">{week.weekNumber}</span>
                </div>

                {/* Day Cells of the Week */}
                {week.days.map((day, idx) => {
                  if (day.dayNum === null) {
                    return (
                      <div key={`empty-${idx}`} className="bg-slate-50/30 border border-dashed border-slate-200/40 rounded-2xl min-h-[85px] md:min-h-[105px] p-1.5 opacity-35 flex items-start justify-start relative">
                        {idx === 0 && (
                          <span className="md:hidden text-[9px] font-black font-sans bg-slate-100 text-slate-400 border border-slate-200/30 px-1 py-0.5 rounded select-none tracking-tighter leading-none">
                            W{week.weekNumber}
                          </span>
                        )}
                      </div>
                    );
                  }

                  const dayNum = day.dayNum;
                  const dayStr = day.dateStr;
                  const isWk = isWeekend(dayStr);
                  const holidayName = holidaysMap.get(dayStr);
                  const dayEntry = entries.find((e) => e.date === dayStr);
                  const isBridgeDay = monthBridgeDays.some((b) => b.date === dayStr);

                  return (
                    <div
                      key={dayStr}
                      onClick={() => handleDayClick(dayStr)}
                      className={`min-h-[85px] md:min-h-[105px] border rounded-2xl p-1.5 sm:p-2 md:p-2.5 transition-all flex flex-col justify-between cursor-pointer group relative min-w-0 overflow-hidden hover:border-brand-blue hover:shadow-md hover:scale-[1.01] ${
                        dayStr === todayStr
                          ? 'ring-2 ring-brand-blue/30 ring-offset-1 border-brand-blue/80 font-semibold shadow-sm'
                          : ''
                      } ${
                        dayEntry
                          ? (dayEntry.category === WorkCategory.Vacation && dayEntry.isBridgeDayTaken
                              ? 'bg-amber-100/90 border-amber-300/80 text-amber-900'
                              : getCategoryThemeClass(dayEntry.category))
                          : isBridgeDay
                          ? 'bg-amber-50/50 border-amber-200/90 text-slate-855 shadow-xs'
                          : dayStr === todayStr
                          ? (isWk ? 'bg-blue-50/30 border-brand-blue/50 text-slate-655' : 'bg-blue-50/40 border-brand-blue/50 text-slate-655')
                          : isWk
                          ? 'bg-slate-50 border-slate-200 text-slate-400'
                          : 'bg-white border-slate-200 text-slate-655'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex justify-between items-start gap-0.5 min-w-0">
                        <div className="flex items-center gap-0.5 md:gap-1 min-w-0">
                          {idx === 0 && (
                            <span 
                              className="md:hidden text-[9px] font-black font-sans bg-slate-100 text-slate-500 border border-slate-200/50 px-1 py-0.5 rounded select-none tracking-tighter leading-none shrink-0" 
                              title={`Week ${week.weekNumber}`}
                            >
                              W{week.weekNumber}
                            </span>
                          )}
                          <span className={`text-sm font-bold font-mono ${
                            dayStr === todayStr
                              ? 'text-brand-blue font-extrabold'
                              : dayEntry?.isBridgeDayTaken
                              ? 'text-amber-900 font-extrabold'
                              : isWk && !dayEntry
                              ? 'text-amber-600'
                              : isBridgeDay && !dayEntry
                              ? 'text-amber-700'
                              : 'text-slate-800'
                          }`}>
                            <span>{dayNum}</span>
                          </span>
                        </div>

                        {isBridgeDay && !dayEntry && (
                          <span className="text-[8px] font-extrabold px-1 py-0.5 bg-amber-500 text-white rounded font-mono scale-90 -translate-y-0.5 shrink-0 leading-none">
                            {isMobile ? 'B' : 'BRIDGE'}
                          </span>
                        )}

                        {dayEntry && dayEntry.isBridgeDayTaken && (
                          <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-amber-600 text-white rounded font-mono scale-90 -translate-y-0.5 shrink-0 leading-none">
                            {isMobile ? 'BT' : 'BRIDGE TAKEN'}
                          </span>
                        )}

                        {holidayName && (
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white shadow-sm shrink-0"
                            title={`Denmark National Holiday: ${holidayName}`}
                          />
                        )}
                      </div>

                      {/* Day Body Content */}
                      <div className="space-y-0.5 mt-1 flex-1 flex flex-col justify-end min-w-0">
                        {dayEntry ? (
                          <div className="space-y-0.5 min-w-0" id="day-data-display">
                            {/* Category Stamp */}
                            <span className="text-[8.5px] md:text-[9px] font-bold tracking-tight block truncate uppercase opacity-95">
                              {getCompactCategoryLabel(dayEntry.category)}
                            </span>

                            {/* Worked hours stamp */}
                            <div className="flex items-center gap-0.5 md:gap-1 flex-wrap min-w-0">
                              <span className="text-[10px] md:text-[11px] font-bold font-mono text-slate-800 whitespace-nowrap">
                                {dayEntry.finalCountedHours.toFixed(2)}{isMobile ? 'h' : ' hrs'}
                              </span>
                              {dayEntry.overtime !== 0 && (
                                <span className={`text-[7.5px] md:text-[8px] font-bold font-mono px-0.5 md:px-1 rounded shrink-0 leading-none ${
                                  dayEntry.overtime > 0
                                    ? 'text-emerald-700 bg-brand-green/20'
                                    : 'text-rose-700 bg-rose-50/10'
                                }`}>
                                  {dayEntry.overtime > 0 ? `+${dayEntry.overtime.toFixed(2)}` : `${dayEntry.overtime.toFixed(2)}`}
                                </span>
                              )}
                            </div>

                            {dayEntry.notes && (
                              <p className="text-[8px] text-slate-500 line-clamp-1 italic font-sans truncate" id="notes-label-item">
                                {dayEntry.notes}
                              </p>
                            )}
                            {dayEntry.location && (
                              <p className="text-[8px] text-indigo-600 font-semibold line-clamp-1 truncate font-sans">
                                📍 {dayEntry.location}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-center items-center py-1 text-slate-400">
                            <PlusCircle className="w-4 h-4 hover:text-brand-blue transition" />
                          </div>
                        )}

                        {/* Holiday label text */}
                        {!dayEntry && holidayName && (
                          <span className="text-[7.5px] md:text-[8px] bg-red-50 text-red-700 border border-red-200 px-1 py-0.5 rounded leading-tight block truncate text-center font-semibold">
                            {holidayName.split('(')[0]}
                          </span>
                        )}
                      </div>

                      {/* Advanced Tooltip details popup on hover */}
                      {dayEntry && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all z-20 w-52 text-xs space-y-1 text-slate-300 select-none">
                          <div className="flex justify-between font-bold text-white border-b border-slate-800 pb-1 font-mono">
                            <span>{dayEntry.weekday}</span>
                            <span className="text-teal-400">{dayEntry.date}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] pt-1">
                            <span>Category:</span>
                            <span className="font-semibold text-white">{dayEntry.category}</span>
                          </div>
                          {dayEntry.location && (
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Location:</span>
                              <span className="font-semibold text-indigo-400 truncate max-w-[120px]">{dayEntry.location}</span>
                            </div>
                          )}
                          {dayEntry.entryTime && (
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Hours punch:</span>
                              <span className="font-mono text-white text-[10px]">
                                {dayEntry.entryTime} - {dayEntry.exitTime}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-[11px]">
                            <span>Expected hrs:</span>
                            <span>{isWk ? '0.00 (Weekend)' : `${settings.standardWorkdayHours.toFixed(2)} hrs`}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span>Overtime impact:</span>
                            <span className={`font-semibold font-mono ${dayEntry.overtime >= 0 ? 'text-emerald-400' : 'text-rose-455'}`}>
                              {dayEntry.overtime >= 0 ? `+${dayEntry.overtime.toFixed(2)}` : dayEntry.overtime.toFixed(2)} hrs
                            </span>
                          </div>
                          {dayEntry.notes && (
                            <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800 leading-tight">
                              💬 "{dayEntry.notes}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

      {/* Legend Block */}
      <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-sm max-w-xl mx-auto w-full font-sans text-xs text-slate-600 space-y-3.5" id="calendar-interactive-legend">
        {/* Row 1 - 3 equal columns */}
        <div className="grid grid-cols-3 gap-x-4 text-center border-b border-slate-100 pb-2.5">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-w-0">
            <div className="w-3 h-3 rounded bg-brand-blue/15 border border-brand-blue/30 shrink-0" />
            <span className="font-semibold whitespace-normal break-words text-center sm:text-left leading-tight">Office</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-w-0">
            <div className="w-3 h-3 rounded bg-teal-500/15 border border-teal-500/30 shrink-0" />
            <span className="font-semibold whitespace-normal break-words text-center sm:text-left leading-tight">WFH</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-w-0">
            <div className="w-3 h-3 rounded bg-indigo-500/15 border border-indigo-500/25 shrink-0" />
            <span className="font-semibold whitespace-normal break-words text-center sm:text-left leading-tight" title="Diff. Office Location">Diff. Office Location</span>
          </div>
        </div>

        {/* Row 2 - 3 equal columns */}
        <div className="grid grid-cols-3 gap-x-4 text-center border-b border-slate-100 pb-2.5">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-w-0">
            <div className="w-3 h-3 rounded bg-brand-green/15 border border-brand-green/25 shrink-0" />
            <span className="font-semibold whitespace-normal break-words text-center sm:text-left leading-tight">Paid Holiday</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-w-0">
            <div className="w-3 h-3 rounded bg-slate-100 border border-slate-205 shrink-0" />
            <span className="font-semibold whitespace-normal break-words text-center sm:text-left leading-tight" title="Unpaid Holiday">Unpaid Holiday</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-w-0">
            <div className="w-3 h-3 rounded bg-purple-500/15 border border-purple-500/25 shrink-0" />
            <span className="font-semibold whitespace-normal break-words text-center sm:text-left leading-tight">Sick day</span>
          </div>
        </div>

        {/* Row 3 - 1 merged cell centered across all 3 columns */}
        <div className="flex justify-center items-center gap-1.5 pt-0.5">
          <div className="w-3 h-3 rounded bg-rose-500/15 border border-rose-500/25 shrink-0" />
          <span className="font-semibold text-center whitespace-normal break-words leading-tight">National holiday</span>
        </div>
      </div>

      {/* Denmark Holidays & Strategic Long Weekends Planner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
          <div>
            <h4 className="text-sm font-bold text-brand-slate tracking-tight flex items-center gap-2">
              <span>Danish National Holidays & Long Weekends Planner ({monthsList[selectedMonth - 1]} {selectedYear})</span>
            </h4>
            <span className="text-xs text-slate-500">Plan your holidays and review long weekends or bridge day options for the selected month.</span>
          </div>
          <div className="flex gap-2 text-[10px] font-bold font-mono">
            <span className="bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md border border-emerald-200">LONG WEEKEND</span>
            <span className="bg-amber-50 text-amber-800 px-2 py-1 rounded-md border border-amber-250">BRIDGE DAY SUGGESTION</span>
          </div>
        </div>

        {monthHolidays.length === 0 && monthBridgeDays.length === 0 ? (
          <p className="text-xs text-slate-405 italic py-4 text-center">
            No public holidays or bridge day suggestions in {monthsList[selectedMonth - 1]} {selectedYear}.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-1" id="holidays-strategy-scrollplane">
            {/* National Holidays List for the selected month */}
            {monthHolidays.map((h, idx) => {
              const dStr = h.date;
              const parts = dStr.split('-');
              const year = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10);
              const day = parseInt(parts[2], 10);

              const d = new Date(Date.UTC(year, month - 1, day));
              const dayOfWeek = d.getUTCDay(); // 0 Sunday, 1 Monday, ...
              const weekNum = getWeekNumber(dStr);

              let isLongWeekend = false;
              let isBridgePossible = false;
              let infoText = 'Standard weekday holiday';

              if (dayOfWeek === 1) { // Monday
                isLongWeekend = true;
                infoText = `Creates a natural 3-day long weekend (Saturday to Monday, Week ${weekNum}).`;
              } else if (dayOfWeek === 5) { // Friday
                isLongWeekend = true;
                infoText = `Creates a natural 3-day long weekend (Friday to Sunday, Week ${weekNum}).`;
              } else if (dayOfWeek === 4) { // Thursday
                // Check if Friday is not a holiday itself
                const friStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`;
                if (!holidaysMap.has(friStr)) {
                  isBridgePossible = true;
                  infoText = `Take Friday off as a bridge day for a 4-day weekend! (Week ${weekNum})`;
                } else {
                  isLongWeekend = true;
                  infoText = `Combines with other holidays to create a long weekend block! (Week ${weekNum})`;
                }
              } else if (dayOfWeek === 2) { // Tuesday
                // Check if Monday is not a holiday itself
                const monStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day - 1).padStart(2, '0')}`;
                if (!holidaysMap.has(monStr)) {
                  isBridgePossible = true;
                  infoText = `Take Monday off as a bridge day for a 4-day weekend! (Week ${weekNum})`;
                } else {
                  isLongWeekend = true;
                  infoText = `Combines with other holidays to create a long weekend block! (Week ${weekNum})`;
                }
              } else if (dayOfWeek === 0 || dayOfWeek === 6) {
                infoText = `Falls on a weekend (${getWeekdayName(dStr)}).`;
              }

              return (
                <div
                  key={`holiday-${idx}`}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md ${
                    isLongWeekend
                      ? 'border-emerald-200 bg-emerald-50/15'
                      : isBridgePossible
                      ? 'border-amber-100 bg-amber-50/10 text-slate-800'
                      : 'border-slate-100 bg-slate-50/30 text-slate-605'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h5 className="font-bold text-slate-800 text-xs leading-snug">{h.name}</h5>
                      <span className="text-[10.5px] text-slate-500 block font-mono font-semibold uppercase">
                        {getWeekdayName(dStr)}, {monthsList[selectedMonth - 1]} {dStr.split('-')[2]} • Week {weekNum}
                      </span>
                    </div>
                    {isLongWeekend && (
                      <span className="text-[9px] font-bold px-2 py-1 bg-emerald-500 text-white rounded-lg uppercase tracking-wider font-mono">
                        LONG WKND
                      </span>
                    )}
                    {isBridgePossible && (
                      <span className="text-[9px] font-bold px-2 py-1 bg-amber-500 text-white rounded-lg uppercase tracking-wider font-mono">
                        BRIDGE POTENTIAL
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200/90 text-[11px] text-slate-600 font-medium flex items-center gap-1.5 leading-tight">
                    <span>{infoText}</span>
                  </div>
                </div>
              );
            })}

            {/* Dynamic Bridge Day Suggestions & visual calendar snapshots */}
            {monthBridgeDays.map((bridge, idx) => {
              const parts = bridge.date.split('-');
              const dayNum = parseInt(parts[2], 10);
              const weekNum = bridge.weekNum;

              // Generate the 4-day strip around the bridge day
              const stripDays: { label: string; dateLabel: string; style: string; isBridge: boolean; isHoliday: boolean }[] = [];
              if (bridge.type === 'Friday') {
                // Thursday (Holiday), Friday (Bridge), Saturday (Weekend), Sunday (Weekend)
                stripDays.push({
                  label: 'Thu',
                  dateLabel: `${dayNum - 1}`,
                  style: 'bg-rose-50 border-rose-200 text-rose-700 font-semibold',
                  isBridge: false,
                  isHoliday: true
                });
                stripDays.push({
                  label: 'Fri',
                  dateLabel: `${dayNum}`,
                  style: 'bg-amber-100 border-amber-300 text-amber-800 font-bold shadow-xs border-2 border-dashed',
                  isBridge: true,
                  isHoliday: false
                });
                stripDays.push({
                  label: 'Sat',
                  dateLabel: `${dayNum + 1}`,
                  style: 'bg-slate-100 border-slate-200 text-slate-600',
                  isBridge: false,
                  isHoliday: false
                });
                stripDays.push({
                  label: 'Sun',
                  dateLabel: `${dayNum + 2}`,
                  style: 'bg-slate-100 border-slate-200 text-slate-600',
                  isBridge: false,
                  isHoliday: false
                });
              } else {
                // Saturday (Weekend), Sunday (Weekend), Monday (Bridge), Tuesday (Holiday)
                stripDays.push({
                  label: 'Sat',
                  dateLabel: `${dayNum - 2}`,
                  style: 'bg-slate-100 border-slate-200 text-slate-600',
                  isBridge: false,
                  isHoliday: false
                });
                stripDays.push({
                  label: 'Sun',
                  dateLabel: `${dayNum - 1}`,
                  style: 'bg-slate-100 border-slate-200 text-slate-600',
                  isBridge: false,
                  isHoliday: false
                });
                stripDays.push({
                  label: 'Mon',
                  dateLabel: `${dayNum}`,
                  style: 'bg-amber-100 border-amber-300 text-amber-800 font-bold shadow-xs border-2 border-dashed',
                  isBridge: true,
                  isHoliday: false
                });
                stripDays.push({
                  label: 'Tue',
                  dateLabel: `${dayNum + 1}`,
                  style: 'bg-rose-50 border-rose-200 text-rose-700 font-semibold',
                  isBridge: false,
                  isHoliday: true
                });
              }

              return (
                <div
                  key={`bridge-${idx}`}
                  className="p-3.5 rounded-xl border border-amber-250 bg-amber-50/5 flex flex-col justify-between transition-all hover:shadow-md"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <div>
                        <h5 className="font-bold text-amber-900 text-xs leading-snug">Bridge Day Opportunity</h5>
                        <span className="text-[10.5px] text-slate-500 block font-mono font-semibold uppercase">
                          {getWeekdayName(bridge.date)}, {monthsList[selectedMonth - 1]} {dayNum} • Week {weekNum}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-1 bg-amber-500 text-white rounded-lg uppercase tracking-wider font-mono shrink-0">
                        BRIDGE DAY
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-normal mb-3">
                      Take this {bridge.type} off next to <span className="font-bold">{bridge.holidayName.split('(')[0].trim()}</span> to unlock a complete 4-day long weekend!
                    </p>
                  </div>

                  {/* Calendar Strip Visual representation */}
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-150 space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block text-center">4-Day Weekend Timeline</span>
                    <div className="grid grid-cols-4 gap-2">
                      {stripDays.map((sd, sidx) => (
                        <div key={sidx} className={`p-1.5 rounded-lg border text-center flex flex-col items-center justify-center ${sd.style}`}>
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold leading-none mb-0.5">{sd.label}</span>
                          <span className="text-xs font-mono font-extrabold leading-none">{sd.dateLabel}</span>
                          <span className="text-[7px] leading-none mt-1 uppercase tracking-tight block truncate w-full">
                            {sd.isBridge ? 'Bridge' : sd.isHoliday ? 'Holiday' : 'Weekend'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar Quick Entry Modal Dialog */}
      {editingDay && (
        <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-brand-slate text-base">Quick Log: {editingDay.dateStr}</h3>
                <span className="text-[11px] text-slate-500 block font-bold font-mono">{getWeekdayName(editingDay.dateStr)}</span>
              </div>
              <button
                onClick={() => setEditingDay(null)}
                className="text-slate-400 hover:text-slate-600 font-extrabold bg-slate-50 hover:bg-slate-100 px-3 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Attendance Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as WorkCategory)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-850 font-semibold focus:ring-1 focus:ring-brand-blue"
                >
                  {Object.values(WorkCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryDisplayName(cat).replace('Working from ', '').replace('Working ', '')}
                    </option>
                  ))}
                </select>
              </div>

              {editCategory === WorkCategory.Vacation && (
                <div className="flex items-center gap-2.5 bg-teal-50/50 border border-teal-200 p-3 rounded-lg animate-fade-in text-xs animate-scale-up">
                  <input
                    type="checkbox"
                    id="edit-checkbox-is-feriefridag"
                    checked={editIsFeriefridag}
                    onChange={(e) => setEditIsFeriefridag(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="edit-checkbox-is-feriefridag" className="text-teal-955 font-bold select-none cursor-pointer">
                    Deduct from Feriefridage hours instead of Vacation days
                  </label>
                </div>
              )}

              {(editCategory === WorkCategory.Office || editCategory === WorkCategory.OtherOffice || editCategory === WorkCategory.WFH) && (
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-slate-500 mb-1">In</label>
                    <input
                      type="time"
                      value={editEntryTime}
                      onChange={(e) => setEditEntryTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Out</label>
                    <input
                      type="time"
                      value={editExitTime}
                      onChange={(e) => setEditExitTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Break (m)</label>
                    <input
                      type="number"
                      value={editBreak}
                      onChange={(e) => setEditBreak(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-800 font-mono"
                    />
                  </div>
                </div>
              )}

              {settings.enableManualOverride && (
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Manual Override (Hours)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 7.4"
                    value={editOverride}
                    onChange={(e) => setEditOverride(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              )}

              {editCategory === WorkCategory.OtherOffice && (
                <div className="space-y-1.5 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl" id="different-office-location-textbox-container">
                  <label className="block text-slate-600 font-semibold">Different Office Location</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter location (e.g. Aarhus Office)"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full bg-white border border-slate-250 rounded-lg pl-2.5 pr-8 py-2 text-slate-800 font-medium focus:ring-1 focus:ring-brand-blue"
                    />
                    {editLocation && (
                      <button
                        type="button"
                        onClick={() => setEditLocation('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-200/50 cursor-pointer flex items-center justify-center"
                        title="Clear location"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {settings.differentOfficeLocations && settings.differentOfficeLocations.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Preloaded Remote Offices:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {settings.differentOfficeLocations.map((loc) => (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => setEditLocation(loc.name)}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                              editLocation === loc.name
                                ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {loc.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Notes / Task Remarks</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Aarhus meeting, teeth clinic, sick leave notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-8 py-2 text-slate-800 text-xs focus:ring-1 focus:ring-brand-blue"
                  />
                  {editNotes && (
                    <button
                      type="button"
                      onClick={() => setEditNotes('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-200/50 cursor-pointer flex items-center justify-center"
                      title="Clear notes"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {editCategory === WorkCategory.Vacation && monthBridgeDays.some((b) => b.date === editingDay.dateStr) && (
                <div className="flex items-center gap-2.5 p-3 bg-amber-50/70 border border-amber-200 rounded-xl" id="bridge-day-checkbox-container">
                  <input
                    type="checkbox"
                    id="is-bridge-day-taken-checkbox"
                    checked={editIsBridgeDayTaken}
                    onChange={(e) => setEditIsBridgeDayTaken(e.target.checked)}
                    className="w-4 h-4 text-amber-600 border-amber-350 rounded focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="is-bridge-day-taken-checkbox" className="text-xs text-amber-800 font-semibold select-none cursor-pointer">
                    This paid holiday is taken on a suggested bridge day (shows soft amber highlight)
                  </label>
                </div>
              )}

              {editingDay.entry && (
                <div className="flex border-t border-slate-100 pt-3 flex-col gap-2 text-[11px]" id="delete-entry-section">
                  {!showDeleteConfirm ? (
                    <div className="flex justify-between items-center w-full">
                      <span className="text-slate-500 font-semibold">Danger Operations:</span>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold px-3 py-1 border border-rose-250/60 rounded transition cursor-pointer"
                      >
                        Delete Entry
                      </button>
                    </div>
                  ) : (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2.5">
                      <p className="font-semibold text-rose-800 leading-normal">
                        Are you sure you want to delete this entry? This action cannot be undone.
                      </p>
                      <div className="flex justify-end gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1 rounded font-semibold transition cursor-pointer shadow-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteEntry(editingDay.dateStr);
                            setEditingDay(null);
                            setShowDeleteConfirm(false);
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded font-bold transition cursor-pointer shadow-sm"
                        >
                          Yes, Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDay(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-blue hover:bg-blue-650 text-white font-bold px-4 py-2 rounded-lg"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
