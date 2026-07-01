/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { DayEntry, WorkCategory, UserSettings, getCategoryDisplayName } from '../types';
import { isWeekend, getWeekdayName, getWeekNumber, calculateDayOvertime } from '../utils/calculations';
import {
  Search,
  Filter,
  Calendar,
  Layers,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Hourglass,
  Clock,
  Briefcase,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

interface EntriesViewProps {
  entries: DayEntry[];
  settings: UserSettings;
  onSaveEntry: (entry: DayEntry) => void;
  onDeleteEntry: (date: string) => void;
}

export default function EntriesView({
  entries,
  settings,
  onSaveEntry,
  onDeleteEntry
}: EntriesViewProps) {
  // Query Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('2026');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortAscending, setSortAscending] = useState<boolean>(false); // default newer first (descending)

  const isYtdScope = filterMonth === 'all' && filterWeek === 'all';

  // Edit State
  const [editingEntry, setEditingEntry] = useState<DayEntry | null>(null);
  const [editCategory, setEditCategory] = useState<WorkCategory>(WorkCategory.Office);
  const [editEntryTime, setEditEntryTime] = useState('08:00');
  const [editExitTime, setEditExitTime] = useState('16:30');
  const [editBreak, setEditBreak] = useState(30);
  const [editOverride, setEditOverride] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Extract list of existing weeks dynamically
  const availableWeeks = useMemo(() => {
    const weeks = new Set<number>();
    entries.forEach((e) => {
      if (e.year === (filterYear === 'all' ? 2026 : parseInt(filterYear, 10))) {
        weeks.add(e.weekNumber);
      }
    });
    return Array.from(weeks).sort((a, b) => a - b);
  }, [entries, filterYear]);

  // Compute filtered subset
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      result = result.filter(
        (e) =>
          (e.notes && e.notes.toLowerCase().includes(query)) ||
          e.date.includes(query) ||
          e.category.toLowerCase().includes(query)
      );
    }

    if (filterYear !== 'all') {
      const yr = parseInt(filterYear, 10);
      result = result.filter((e) => e.year === yr);
    }

    if (filterMonth !== 'all') {
      const mn = parseInt(filterMonth, 10);
      result = result.filter((e) => e.month === mn);
    }

    if (filterWeek !== 'all') {
      const wk = parseInt(filterWeek, 10);
      result = result.filter((e) => e.weekNumber === wk);
    }

    if (filterCategory !== 'all') {
      result = result.filter((e) => e.category === filterCategory);
    }

    result.sort((a, b) => {
      return sortAscending
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date);
    });

    return result;
  }, [entries, searchTerm, filterYear, filterMonth, filterWeek, filterCategory, sortAscending]);

  // Totals calculations
  const totals = useMemo(() => {
    let totalHours = 0;
    let totalOvertime = 0;
    filteredEntries.forEach((e) => {
      totalHours += e.finalCountedHours;
      totalOvertime += e.overtime;
    });

    return {
      count: filteredEntries.length,
      hours: parseFloat(totalHours.toFixed(1)),
      overtime: parseFloat(totalOvertime.toFixed(1))
    };
  }, [filteredEntries]);

  const handleEditClick = (entry: DayEntry) => {
    setEditingEntry(entry);
    setEditCategory(entry.category);
    setEditEntryTime(entry.entryTime || '08:00');
    setEditExitTime(entry.exitTime || '16:30');
    setEditBreak(entry.breakMinutes ?? 30);
    setEditOverride(entry.overriddenTotalHours !== undefined ? String(entry.overriddenTotalHours) : '');
    setEditNotes(entry.notes || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const isWk = isWeekend(editingEntry.date);
    let calculatedHours = 0;
    if (editCategory === WorkCategory.Office || editCategory === WorkCategory.OtherOffice) {
      const parts1 = editEntryTime.split(':');
      const parts2 = editExitTime.split(':');
      if (parts1.length === 2 && parts2.length === 2) {
        const entryMin = parseInt(parts1[0], 10) * 60 + parseInt(parts1[1], 10);
        const exitMin = parseInt(parts2[0], 10) * 60 + parseInt(parts2[1], 10);
        const total = exitMin - entryMin - editBreak;
        calculatedHours = parseFloat((total / 60).toFixed(2));
      }
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

    const updated: DayEntry = {
      ...editingEntry,
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

    onSaveEntry(updated);
    setEditingEntry(null);
  };

  const getCategoryBadgeClass = (cat: WorkCategory) => {
    switch (cat) {
      case WorkCategory.Office:
        return 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20';
      case WorkCategory.WFH:
        return 'bg-teal-50 text-teal-700 border border-teal-200/50';
      case WorkCategory.Holiday:
        return 'bg-rose-50 text-rose-700 border border-rose-200/40';
      case WorkCategory.Vacation:
        return 'bg-brand-green/10 text-emerald-800 border border-brand-green/20';
      case WorkCategory.Sick:
        return 'bg-brand-peach/10 text-amber-800 border border-brand-peach/20';
      case WorkCategory.UnpaidFerie:
        return 'bg-slate-100 text-slate-650 border border-slate-200';
      case WorkCategory.OtherOffice:
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200/50';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="logged-entries-directory">
      {/* Search & Filter Header card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4">
          <div>
            <h3 className="text-base font-bold text-brand-slate tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="text-brand-blue w-5 h-5" />
              <span>Historical Working Logs</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Currently displaying <strong className="text-slate-800 font-semibold">{filteredEntries.length}</strong> logged work records
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search notes, dates, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 text-slate-805 w-full focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <button
              onClick={() => setSortAscending((prev) => !prev)}
              className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs text-slate-705 font-bold px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              title="Sort Date Chronologically"
            >
              <span>Date</span>
              {sortAscending ? <ChevronUp className="w-4 h-4 text-brand-blue" /> : <ChevronDown className="w-4 h-4 text-brand-blue" />}
            </button>
          </div>
        </div>

        {/* Filter Sliders */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 mb-1.5 font-semibold flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" /> Log Scope
            </label>
            <select
              value={isYtdScope ? 'ytd' : 'custom'}
              onChange={(e) => {
                if (e.target.value === 'ytd') {
                  setFilterMonth('all');
                  setFilterWeek('all');
                } else {
                  setFilterMonth('6'); // Default June (current active month)
                  setFilterWeek('all');
                }
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-brand-slate focus:outline-none focus:ring-1 focus:ring-brand-blue font-bold w-full cursor-pointer transition-colors"
            >
              <option value="ytd">YTD Log</option>
              <option value="custom">Monthly Log</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1.5 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Year
            </label>
            <select
              value={filterYear}
              onChange={(e) => { setFilterYear(e.target.value); setFilterWeek('all'); }}
              className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue font-semibold w-full cursor-pointer"
            >
              <option value="all">All Years</option>
              <option value="2026">2026 Tax Year</option>
              <option value="2025">2025 Tax Year</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1.5 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Month
            </label>
            <select
              value={filterMonth}
              disabled={isYtdScope}
              onChange={(e) => setFilterMonth(e.target.value)}
              className={`border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue font-semibold w-full cursor-pointer ${
                isYtdScope ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-75' : 'bg-slate-50'
              }`}
            >
              {isYtdScope ? (
                <option value="all">All Months (YTD)</option>
              ) : (
                <>
                  <option value="all">All Months</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1.5 font-semibold flex items-center gap-1">
              <Hourglass className="w-3.5 h-3.5 text-slate-400" /> Calendar Week
            </label>
            <select
              value={filterWeek}
              disabled={isYtdScope}
              onChange={(e) => setFilterWeek(e.target.value)}
              className={`border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue font-semibold w-full font-mono cursor-pointer ${
                isYtdScope ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-75' : 'bg-slate-50'
              }`}
            >
              {isYtdScope ? (
                <option value="all">All Weeks (YTD)</option>
              ) : (
                <>
                  <option value="all">All Weeks</option>
                  {availableWeeks.map((week) => (
                    <option key={week} value={week}>
                      Week {week}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1.5 font-semibold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" /> Work Status
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue font-semibold w-full cursor-pointer"
            >
              <option value="all">All Categories</option>
              {Object.values(WorkCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryDisplayName(cat).replace('Working from ', '').replace('Working ', '')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Aggregate Scoreboards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3 shadow-sm">
          <div className="p-3 rounded-lg bg-brand-blue/10 text-brand-blue">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Record count matched</span>
            <span className="text-base font-extrabold text-slate-800 block">{totals.count} entries</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3 shadow-sm">
          <div className="p-3 rounded-lg bg-teal-500/10 text-teal-600">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Accumulated Work Hours</span>
            <span className="text-base font-extrabold text-slate-800 block font-mono">{totals.hours} hrs</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3 shadow-sm">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Filtered Overtime impact</span>
            <span className={`text-base font-extrabold block font-mono ${totals.overtime >= 0 ? 'text-brand-green' : 'text-rose-500'}`}>
              {totals.overtime >= 0 ? `+${totals.overtime}` : totals.overtime} hrs
            </span>
          </div>
        </div>
      </div>

      {/* Entries Data Table / list layout */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">Date & Weekday</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-center">Fidelity Times</th>
                <th className="p-4 text-center">Standard</th>
                <th className="p-4 text-center">Counted</th>
                <th className="p-4 text-center">Overtime</th>
                <th className="p-4">Work notes</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100" id="historical-logs-table-body">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => {
                  const isWk = isWeekend(entry.date);
                  const isCalculatedOverridden = entry.overriddenTotalHours !== undefined;

                  return (
                    <tr key={entry.date} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800 font-mono text-[13px]">{entry.date}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{entry.weekday} (W{entry.weekNumber})</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold leading-none ${getCategoryBadgeClass(entry.category)}`}>
                          {getCategoryDisplayName(entry.category).replace('Working from ', '').replace('Working ', '')}
                        </span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap text-slate-600 font-mono">
                        {entry.entryTime && entry.exitTime ? (
                          <span>
                            {entry.entryTime} - {entry.exitTime}
                            <span className="text-[10px] text-slate-400 block font-sans">(-{entry.breakMinutes || 0}m break)</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center text-slate-500 font-mono">
                        {isWk ? '0.0' : `${settings.standardWorkdayHours}`} hrs
                      </td>
                      <td className="p-4 text-center font-bold text-slate-800 font-mono text-[13px]">
                        {entry.finalCountedHours.toFixed(1)} hrs
                        {isCalculatedOverridden && (
                          <span className="text-[9px] block text-brand-peach font-bold font-sans" title="Manually overridden hours">Overridden</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold font-mono text-[13px]">
                        <span className={entry.overtime > 0 ? 'text-brand-green' : entry.overtime < 0 ? 'text-rose-500 font-bold' : 'text-slate-400'}>
                          {entry.overtime >= 0 ? `+${entry.overtime.toFixed(1)}` : entry.overtime.toFixed(1)}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="text-slate-650 truncate text-[11px]" title={entry.notes}>
                          {entry.notes || <span className="text-slate-400 font-medium block italic">Empty note</span>}
                        </p>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => handleEditClick(entry)}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-600 p-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
                          title="Edit Entry"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove log for date: ${entry.date}?`)) {
                              onDeleteEntry(entry.date);
                            }
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-1.5 border border-rose-250/60 rounded-lg transition cursor-pointer"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-450">
                    <p className="font-semibold text-slate-400">No matching entries found.</p>
                    <p className="text-[11px] mt-1 text-slate-500">Try adjusting your filters or searches above.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal popover */}
      {editingEntry && (
        <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-brand-slate text-base">Edit Log: {editingEntry.date}</h3>
                <span className="text-xs text-slate-505 block font-bold">{editingEntry.weekday}</span>
              </div>
              <button
                onClick={() => setEditingEntry(null)}
                className="text-slate-400 hover:text-slate-650 font-extrabold bg-slate-55 hover:bg-slate-100 px-3 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-650 mb-1 font-semibold">Attendance Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as WorkCategory)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-1 focus:ring-brand-blue font-semibold"
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
                    <label className="block text-slate-500 mb-1">Entry</label>
                    <input
                      type="time"
                      value={editEntryTime}
                      onChange={(e) => setEditEntryTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Exit</label>
                    <input
                      type="time"
                      value={editExitTime}
                      onChange={(e) => setEditExitTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Break (m)</label>
                    <input
                      type="number"
                      value={editBreak}
                      onChange={(e) => setEditBreak(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full bg-white border border-slate-200 rounded p-1 text-slate-800 font-mono"
                    />
                  </div>
                </div>
              )}

              {settings.enableManualOverride && (
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold font-mono">Manual Override Hours</label>
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
                <label className="block text-slate-500 mb-1 font-semibold">Notes / Comment</label>
                <div className="relative">
                  <input
                    type="text"
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

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="bg-slate-105 hover:bg-slate-200 text-slate-705 font-bold px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-blue hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
