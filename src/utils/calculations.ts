/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayEntry, WorkCategory, UserSettings, TaxRateSetting } from '../types';
import { getDanishHolidays, formatDateISO } from './holidays';

/**
 * Calculates standard ISO 8601 week number.
 */
export function getWeekNumber(dateStr: string | Date): number {
  const target = typeof dateStr === 'string' ? new Date(dateStr) : new Date(dateStr.getTime());
  const d = new Date(Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

/**
 * Checks if a date falls on a weekend (Saturday or Sunday).
 */
export function isWeekend(dateStr: string): boolean {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const day = new Date(Date.UTC(y, m, d)).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Gets the English weekday name.
 */
export function getWeekdayName(dateStr: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const day = new Date(Date.UTC(y, m, d)).getUTCDay();
  return days[day];
}

/**
 * Formats standard time strings into numeric minutes for math.
 * "16:30" -> 16 * 60 + 30 = 990
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Calculates decimal hours from entry and exit times with break subtraction.
 */
export function calculateHours(entryTime?: string, exitTime?: string, breakMinutes = 0): number {
  if (!entryTime || !exitTime) return 0;
  const entryMin = parseTimeToMinutes(entryTime);
  const exitMin = parseTimeToMinutes(exitTime);
  if (exitMin <= entryMin) return 0;

  const totalMinutes = exitMin - entryMin - breakMinutes;
  return Math.max(0, parseFloat((totalMinutes / 60).toFixed(2)));
}

/**
 * Compute the overtime for a single day based on rules and standard workday hours.
 */
export function calculateDayOvertime(
  category: WorkCategory,
  hours: number,
  isWeekendDay: boolean,
  standardHours: number
): number {
  if (isWeekendDay) {
    // Weekends expect 0 hours of standard work
    if (
      category === WorkCategory.Office ||
      category === WorkCategory.WFH ||
      category === WorkCategory.OtherOffice
    ) {
      return hours; // Everything worked is overtime
    }
    return 0; // Other statuses on weekend are neutral (vacation, holiday, etc.)
  }

  // Weekdays
  switch (category) {
    case WorkCategory.Holiday:
    case WorkCategory.Vacation:
    case WorkCategory.Sick:
      // Earned = standard workday, so overtime is neutral 0
      return 0;

    case WorkCategory.UnpaidFerie:
      // Earned = 0, standard expected = standard, so overtime is -standard (retaining the deficit)
      return -standardHours;

    case WorkCategory.Office:
    case WorkCategory.WFH:
    case WorkCategory.OtherOffice:
    default:
      // Actual hours worked compared against standard requirement
      return parseFloat((hours - standardHours).toFixed(2));
  }
}

/**
 * Calculates Danish SKAT commute tax deduction for a single day.
 * - First 24 km are not deductible.
 * - Portion between 25 and 120 km is paid at rate 1 (e.g., 2.28 DKK/km).
 * - Portion above 120 km is paid at rate 2 (e.g., 1.14 DKK/km).
 */
export function calculateCommuteDeduction(distanceKm: number, taxRate: TaxRateSetting): number {
  // Danish SKAT Commute Deduction Logic (Befordringsfradrag):
  // 1. First 24 km of the total daily round-trip commute (thresholdKm) are NOT deductible.
  //    If the round-trip distance is 24 km or less, the deduction is 0.
  if (distanceKm <= taxRate.thresholdKm) {
    return 0;
  }

  // Developer Note: 'effectiveKm' represents the daily round-trip commute distance.
  // It is functionally identical to distanceKm but kept for clear semantic separation 
  // when checking multi-tier distance thresholds in Danish SKAT calculations.
  const effectiveKm = distanceKm; 
  const limit = taxRate.limitKm;       // Typically 120 km threshold
  const rate1 = taxRate.rate1;         // DKK per km for 25-120 km tier (e.g. 2.28 DKK/km)
  const rate2 = taxRate.rate2;         // DKK per km for portion above 120 km (e.g. 1.14 DKK/km)
  const threshold = taxRate.thresholdKm; // Deductible threshold (typically 24 km)

  // 2. Commutes between 25 km and 120 km:
  //    Deduction = (Total round-trip distance - 24 km) * Rate 1
  if (effectiveKm <= limit) {
    const deductibleKm = effectiveKm - threshold;
    return parseFloat((deductibleKm * rate1).toFixed(2));
  } else {
    // 3. Commutes exceeding 120 km:
    //    - The first tier (25 km to 120 km = 96 km) is paid at Rate 1.
    //    - Any distance above 120 km (Total round-trip - 120 km) is paid at Rate 2.
    const tier1Km = limit - threshold;
    const tier2Km = effectiveKm - limit;
    const totalDeduction = (tier1Km * rate1) + (tier2Km * rate2);
    return parseFloat(totalDeduction.toFixed(2));
  }
}

/**
 * Seed data generation logic.
 * Seeds days for 2026 starting from 2026-01-01 up to the current date 2026-06-10.
 */
export function generateSeedData(standardHours = 7.4): DayEntry[] {
  const entries: DayEntry[] = [];
  const start = new Date(Date.UTC(2026, 0, 3));
  const end = new Date(); // Up to the current day

  const danishHolidays = getDanishHolidays(2026);
  const holidaysMap = new Map<string, string>();
  danishHolidays.forEach(h => {
    holidaysMap.set(h.date, h.name);
  });

  const currentDate = new Date(start);

  const officeNotes = [
    "Collaborative team sync and server deployment",
    "Project status review and local database optimization",
    "Sprint planning meeting and core development",
    "On-site performance profiling and client feedback session",
    "Regular office day, code reviews and pair programming",
    "Design review and alignment with Danish office colleagues"
  ];

  const wfhNotes = [
    "Remote backlog refinement and modularization",
    "Deep focus on clean code and unit test coverage",
    "WFH: asynchronous communication and documentation update",
    "Remote code audit and optimization of calculation utility",
    "Focus on pending tasks, reduced commute stress"
  ];

  const vacationNotes = [
    "Rest and recreation in Jutland",
    "Summer holiday trip with family",
    "Extended weekend holiday",
    "Annual vacation leave"
  ];

  const sickNotes = [
    "Mild seasonal cold, resting",
    "Sore throat and fever, out of office",
    "Medical checkup and recovery"
  ];

  const unpaidFerieNotes = [
    "Unpaid personal leave for travel",
    "Family event in the countryside",
    "Personal appointment and study day"
  ];

  const entryTimes = ["07:30", "07:45", "08:00", "08:15", "08:30", "08:45", "09:00"];
  const exitTimes = ["15:30", "15:45", "16:00", "16:15", "16:30", "16:45", "17:00", "17:15", "17:30", "17:45"];

  const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  while (currentDate <= end) {
    const dateStr = formatDateISO(currentDate);
    const dayOfWeek = currentDate.getUTCDay();
    const isWkEnd = dayOfWeek === 0 || dayOfWeek === 6;

    // Check if national holiday
    const holidayName = holidaysMap.get(dateStr);

    if (isWkEnd) {
      // By default no weekend records to keep clean, unless user override.
      // Move to next day
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      continue;
    }

    let category = WorkCategory.Office;
    let entryTime = "08:00";
    let exitTime = "16:30";
    let breakMin = 30;
    let overriddenHours: number | undefined = undefined;
    let notes = "";

    const month = currentDate.getUTCMonth(); // 0 = Jan, 5 = Jun
    const day = currentDate.getUTCDate();

    if (holidayName) {
      category = WorkCategory.Holiday;
      notes = `Public Holiday: ${holidayName}`;
    } else {
      // Generate randomized but plausible categories
      const rand = Math.random();
      if (rand < 0.48) {
        category = WorkCategory.Office;
        entryTime = getRandomElement(entryTimes);
        exitTime = getRandomElement(exitTimes);
        notes = getRandomElement(officeNotes);
      } else if (rand < 0.55) {
        category = WorkCategory.OtherOffice;
        entryTime = getRandomElement(entryTimes);
        exitTime = getRandomElement(exitTimes);
        notes = "Working from a different regional office in " + getRandomElement(["Aarhus", "Odense", "Aalborg", "Esbjerg"]);
      } else if (rand < 0.85) {
        category = WorkCategory.WFH;
        notes = getRandomElement(wfhNotes);
      } else if (rand < 0.92) {
        category = WorkCategory.Vacation;
        notes = getRandomElement(vacationNotes);
      } else if (rand < 0.96) {
        category = WorkCategory.Sick;
        notes = getRandomElement(sickNotes);
      } else {
        category = WorkCategory.UnpaidFerie;
        notes = getRandomElement(unpaidFerieNotes);
      }
    }

    // Calculated hours
    let calcHours = 0;
    if (category === WorkCategory.Office || category === WorkCategory.OtherOffice) {
      calcHours = calculateHours(entryTime, exitTime, breakMin);
    } else if (category === WorkCategory.WFH) {
      calcHours = standardHours; // Default WFH to exact standard 7.4 unless specified
    } else if (
      category === WorkCategory.Holiday ||
      category === WorkCategory.Vacation ||
      category === WorkCategory.Sick
    ) {
      calcHours = standardHours;
    } else {
      // Unpaid ferie
      calcHours = 0;
    }

    const finalHours = overriddenHours !== undefined ? overriddenHours : calcHours;
    const ot = calculateDayOvertime(category, finalHours, isWkEnd, standardHours);

    entries.push({
      date: dateStr,
      weekday: getWeekdayName(dateStr),
      weekNumber: getWeekNumber(dateStr),
      month: month + 1,
      year: currentDate.getUTCFullYear(),
      category,
      entryTime: (category === WorkCategory.Office || category === WorkCategory.OtherOffice) ? entryTime : undefined,
      exitTime: (category === WorkCategory.Office || category === WorkCategory.OtherOffice) ? exitTime : undefined,
      breakMinutes: (category === WorkCategory.Office || category === WorkCategory.OtherOffice) ? breakMin : undefined,
      calculatedHours: calcHours,
      overriddenTotalHours: overriddenHours,
      finalCountedHours: finalHours,
      overtime: ot,
      notes,
      createdUpdatedTimestamp: new Date().toISOString()
    });

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return entries;
}

/**
 * Calculates commute distance for a single DayEntry based on user settings
 */
export function getCommuteDistance(entry: DayEntry, settings: UserSettings): number {
  if (isWeekend(entry.date)) return 0;

  if (entry.category === WorkCategory.Office) {
    return typeof settings.roundTripDistanceKm === 'number' ? settings.roundTripDistanceKm : 0;
  }

  if (entry.category === WorkCategory.OtherOffice) {
    if (entry.location) {
      const loc = (settings.differentOfficeLocations || []).find(
        (l) => l.name === entry.location
      );
      if (loc) {
        return loc.includeInCommute ? loc.roundTripDistanceKm : 0;
      }
    }
    // Fallback if there is only 1 different office location registered
    const locList = settings.differentOfficeLocations || [];
    if (locList.length === 1 && locList[0].includeInCommute) {
      return locList[0].roundTripDistanceKm;
    }
  }

  return 0;
}
