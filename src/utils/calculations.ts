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
  const d = new Date(dateStr);
  const day = d.getDay(); // 0 is Sunday, 6 is Saturday
  return day === 0 || day === 6;
}

/**
 * Gets the English weekday name.
 */
export function getWeekdayName(dateStr: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = new Date(dateStr);
  return days[d.getDay()];
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
  if (distanceKm <= taxRate.thresholdKm) {
    return 0;
  }

  const effectiveKm = distanceKm; // Round-trip limit is checked
  const limit = taxRate.limitKm;
  const rate1 = taxRate.rate1;
  const rate2 = taxRate.rate2;
  const threshold = taxRate.thresholdKm;

  if (effectiveKm <= limit) {
    const deductibleKm = effectiveKm - threshold;
    return parseFloat((deductibleKm * rate1).toFixed(2));
  } else {
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
  const end = new Date(Date.UTC(2026, 5, 10)); // Up to June 10, 2026 (local time in prompt)

  const danishHolidays = getDanishHolidays(2026);
  const holidaysMap = new Map<string, string>();
  danishHolidays.forEach(h => {
    holidaysMap.set(h.date, h.name);
  });

  const currentDate = new Date(start);

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
    let entryTime = '08:00';
    let exitTime = '16:30';
    let breakMin = 30;
    let overriddenHours: number | undefined = undefined;
    let notes = '';

    // Determine category based on month and date patterns to simulate real logs
    const month = currentDate.getUTCMonth(); // 0 = Jan, 5 = Jun
    const day = currentDate.getUTCDate();

    if (holidayName) {
      category = WorkCategory.Holiday;
      notes = `Public Holiday: ${holidayName}`;
    } else if (month === 1 && day >= 16 && day <= 20) {
      // Winter vacation in Feb (5 days)
      category = WorkCategory.Vacation;
      notes = 'Winter holiday in Denmark';
    } else if (month === 2 && day === 11) {
      // Sick day in March
      category = WorkCategory.Sick;
      notes = 'Sore throat, stayed in bed';
    } else if (month === 4 && day >= 11 && day <= 13) {
      // Unpaid ferie in May (3 days)
      category = WorkCategory.UnpaidFerie;
      notes = 'Extended weekend trip (unpaid ferie)';
    } else if ((month === 3 && day === 8) || (month === 0 && day === 20)) {
      // Different office location
      category = WorkCategory.OtherOffice;
      entryTime = '09:00';
      exitTime = '17:00';
      breakMin = 30;
      notes = 'Aarhus branch visit, clients sessions';
    } else {
      // regular working days: mixture of Office and WFH
      // Let's alternate to look organic (e.g. Wed and Thu are WFH, Mon, Tue, Fri are Office)
      if (dayOfWeek === 3 || dayOfWeek === 4) {
        category = WorkCategory.WFH;
        notes = 'Remote working; focus on development backlog';
      } else {
        category = WorkCategory.Office;
        // Varied work hours
        if (day % 7 === 0) {
          entryTime = '08:00';
          exitTime = '17:30'; // Long office day, extra overtime
          notes = 'Quarterly review preparation and deployment';
        } else if (day % 5 === 0) {
          entryTime = '08:15';
          exitTime = '16:15'; // Short office day
          notes = 'Finished tasks early, commute avoidance';
        } else {
          entryTime = '08:00';
          exitTime = '16:30';
          notes = 'Standard office day';
        }
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
