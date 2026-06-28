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
  AlertTriangle
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
  const currentLocalTime = new Date('2026-06-10T20:00:33Z');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // Default June
  const [showWeekends, setShowWeekends] = useState<boolean>(false);
  const todayStr = formatDateISO(new Date());

  // Modal State for Quick Popup Editing
  const [editingDay, setEditingDay] = useState<{ dateStr: string; entry?: DayEntry } | null>(null);
  const [editCategory, setEditCategory] = useState<WorkCategory>(WorkCategory.Office);
  const [editEntryTime, setEditEntryTime] = useState('08:00');
  const [editExitTime, setEditExitTime] = useState('16:30');
  const [editBreak, setEditBreak] = useState(30);
  const [editOverride, setEditOverride] = useState('');
  const [editNotes, setEditNotes] = useState('');

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
      
      const dObj = new Date(dateStr);
      const dayOfWeek = dObj.getDay(); // 0 Sunday, 1 Monday, 5 Friday
      const weekNum = getWeekNumber(dateStr);
      
      if (dayOfWeek === 5) { // Friday
        // Check if Thursday is a holiday
        const prevDate = new Date(dObj);
        prevDate.setDate(prevDate.getDate() - 1);
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
        const nextDate = new Date(dObj);
        nextDate.setDate(nextDate.getDate() + 1);
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

  // Calculate day cells
  const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
  const firstDayOfWeekIndex = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
  const emptyPreCellsCount = (firstDayOfWeekIndex + 6) % 7;

  // Custom weekdays indentation calculation Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat/Sun=0
  let emptyPreCellsCountWeekdays = 0;
  if (firstDayOfWeekIndex >= 1 && firstDayOfWeekIndex <= 5) {
    emptyPreCellsCountWeekdays = firstDayOfWeekIndex - 1;
  }

  const totalDaysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

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
    const existing = entries.find((e) => e.date === dateStr);
    setEditingDay({ dateStr, entry: existing });

    if (existing) {
      setEditCategory(existing.category);
      setEditEntryTime(existing.entryTime || '08:00');
      setEditExitTime(existing.exitTime || '16:30');
      setEditBreak(existing.breakMinutes ?? 30);
      setEditOverride(existing.overriddenTotalHours !== undefined ? String(existing.overriddenTotalHours) : '');
      setEditNotes(existing.notes || '');
    } else {
      const isHoli = holidaysMap.has(dateStr);
      setEditCategory(isWeekend(dateStr) ? (isHoli ? WorkCategory.Holiday : WorkCategory.Vacation) : (isHoli ? WorkCategory.Holiday : WorkCategory.Office));
      setEditEntryTime('08:00');
      setEditExitTime('16:30');
      setEditBreak(30);
      setEditOverride('');
      setEditNotes(isHoli ? `Public Holiday: ${holidaysMap.get(dateStr)}` : '');
    }
  };

  const handleModalSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay) return;

    const { dateStr } = editingDay;
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = d.getMonth() + 1;
    const isWk = isWeekend(dateStr);

    let calculatedHours = 0;
    if (editCategory === WorkCategory.Office || editCategory === WorkCategory.OtherOffice) {
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
    } else if (editCategory === WorkCategory.WFH) {
      calculatedHours = settings.standardWorkdayHours;
    } else if (editCategory === WorkCategory.UnpaidFerie) {
      calculatedHours = 0;
    } else {
      calculatedHours = settings.standardWorkdayHours;
    }

    const finalHours = editOverride && settings.enableManualOverride
      ? parseFloat(editOverride) || 0
      : calculatedHours;

    const ot = calculateDayOvertime(editCategory, finalHours, isWk, settings.standardWorkdayHours);

    const updatedEntry: DayEntry = {
      date: dateStr,
      weekday: getWeekdayName(dateStr),
      weekNumber: getWeekNumber(dateStr),
      month: mm,
      year: yyyy,
      category: editCategory,
      entryTime: (editCategory === WorkCategory.Office || editCategory === WorkCategory.OtherOffice) ? editEntryTime : undefined,
      exitTime: (editCategory === WorkCategory.Office || editCategory === WorkCategory.OtherOffice) ? editExitTime : undefined,
      breakMinutes: (editCategory === WorkCategory.Office || editCategory === WorkCategory.OtherOffice) ? editBreak : undefined,
      calculatedHours,
      overriddenTotalHours: editOverride !== '' ? parseFloat(editOverride) : undefined,
      finalCountedHours: finalHours,
      overtime: ot,
      notes: editNotes,
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
            <span className="px-2 py-0.5 font-mono">JUNE 2026 ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Weekdays Grid Headers */}
      <div className={`grid ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'} text-center text-xs font-bold uppercase tracking-wider text-slate-500 font-sans border-b border-slate-100 pb-2`}>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        {showWeekends && <div className="text-amber-600">Sat</div>}
        {showWeekends && <div className="text-amber-600">Sun</div>}
      </div>

      {/* Calendar Grid cells */}
      <div className={`grid ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'} gap-2`} id="calendar-month-squares-grid">
        {/* Fill Empty Pre-Cells */}
        {Array.from({ length: showWeekends ? emptyPreCellsCount : emptyPreCellsCountWeekdays }).map((_, idx) => (
          <div key={`empty-${idx}`} className="bg-slate-50/50 border border-dashed border-slate-200/60 rounded-xl min-h-[100px] opacity-40" />
        ))}

        {/* Fill Actual Day Cells */}
        {Array.from({ length: totalDaysInMonth }).map((_, dayIdx) => {
          const dayNum = dayIdx + 1;
          const dayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isWk = isWeekend(dayStr);
          if (!showWeekends && isWk) {
            return null;
          }

          const holidayName = holidaysMap.get(dayStr);
          const dayEntry = entries.find((e) => e.date === dayStr);

          return (
            <div
              key={dayStr}
              onClick={() => handleDayClick(dayStr)}
              className={`min-h-[105px] border rounded-2xl p-2.5 transition-all flex flex-col justify-between cursor-pointer group relative hover:border-brand-blue hover:shadow-md hover:scale-[1.01] ${
                dayStr === todayStr
                  ? 'ring-2 ring-brand-blue ring-offset-2 border-brand-blue font-semibold shadow-md'
                  : ''
              } ${
                dayEntry
                  ? getCategoryThemeClass(dayEntry.category)
                  : isWk
                  ? 'bg-slate-50 border-slate-200 text-slate-400'
                  : 'bg-white border-slate-200 text-slate-655'
              }`}
            >
              {/* Day Header */}
              <div className="flex justify-between items-start">
                <span className={`text-sm font-bold font-mono ${
                  dayStr === todayStr
                    ? 'text-brand-blue font-extrabold'
                    : isWk && !dayEntry
                    ? 'text-amber-600'
                    : 'text-slate-800'
                }`}>
                  <span>{dayNum}</span>
                </span>

                {holidayName && (
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white shadow-sm"
                    title={`Denmark National Holiday: ${holidayName}`}
                  />
                )}
              </div>

              {/* Day Body Content */}
              <div className="space-y-1 mt-1.5 flex-1 flex flex-col justify-end">
                {dayEntry ? (
                  <div className="space-y-0.5" id="day-data-display">
                    {/* Category Stamp */}
                    <span className="text-[9px] font-bold tracking-tight block truncate uppercase opacity-95">
                      {getCategoryDisplayName(dayEntry.category).replace('Working from ', '').replace('Working ', '')}
                    </span>

                    {/* Worked hours stamp */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold font-mono text-slate-800">
                        {dayEntry.finalCountedHours.toFixed(2)} hrs
                      </span>
                      {dayEntry.overtime !== 0 && (
                        <span className={`text-[8px] font-bold font-mono px-1 rounded ${
                          dayEntry.overtime > 0
                            ? 'text-emerald-700 bg-brand-green/20'
                            : 'text-rose-700 bg-rose-500/10'
                        }`}>
                          {dayEntry.overtime > 0 ? `+${dayEntry.overtime.toFixed(2)}` : `${dayEntry.overtime.toFixed(2)}`}
                        </span>
                      )}
                    </div>

                    {dayEntry.notes && (
                      <p className="text-[8px] text-slate-500 line-clamp-1 italic font-sans" id="notes-label-item">
                        {dayEntry.notes}
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
                  <span className="text-[8px] bg-red-50 text-red-700 border border-red-200 px-1 py-0.5 rounded leading-tight block truncate text-center font-semibold">
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
            <span className="font-semibold whitespace-normal break-words text-center sm:text-left leading-tight">Vacation</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-w-0">
            <div className="w-3 h-3 rounded bg-slate-100 border border-slate-205 shrink-0" />
            <span className="font-semibold whitespace-normal break-words text-center sm:text-left leading-tight" title="Unpaid vacation">Unpaid vacation</span>
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
              const d = new Date(dStr);
              const dayOfWeek = d.getDay(); // 0 Sunday, 1 Monday, ...
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
                const friStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.getDate() + 1).padStart(2, '0')}`;
                if (!holidaysMap.has(friStr)) {
                  isBridgePossible = true;
                  infoText = `Take Friday off as a bridge day for a 4-day weekend! (Week ${weekNum})`;
                } else {
                  isLongWeekend = true;
                  infoText = `Combines with other holidays to create a long weekend block! (Week ${weekNum})`;
                }
              } else if (dayOfWeek === 2) { // Tuesday
                // Check if Monday is not a holiday itself
                const monStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.getDate() - 1).padStart(2, '0')}`;
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

              {(editCategory === WorkCategory.Office || editCategory === WorkCategory.OtherOffice) && (
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

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Notes / Task Remarks</label>
                <input
                  type="text"
                  placeholder="Aarhus meeting, teeth clinic, sick leave notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 text-xs focus:ring-1 focus:ring-brand-blue"
                />
              </div>

              {editingDay.entry && (
                <div className="flex border-t border-slate-100 pt-3 justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-semibold">Danger Operations:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this entry? This actions cannot be undone.')) {
                        onDeleteEntry(editingDay.dateStr);
                        setEditingDay(null);
                      }
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold px-3 py-1 border border-rose-250/60 rounded font-semibold transition"
                  >
                    Delete Entry
                  </button>
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
