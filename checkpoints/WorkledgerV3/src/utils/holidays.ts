/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HolidaySetting } from '../types';

/**
 * Calculates the UTC Date of Easter Sunday for a given year using the Meeus/Jones/Butcher algorithm.
 */
export function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Helper to add days to a Date object in a UTC-safe way.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Helper to format a Date object as YYYY-MM-DD.
 */
export function formatDateISO(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Generates the complete list of Denmark public holidays for a given year.
 */
export function getDanishHolidays(year: number): HolidaySetting[] {
  const easter = getEasterDate(year);

  // Easter-relative holidays
  const maundyThursday = addDays(easter, -3);
  const goodFriday = addDays(easter, -2);
  const easterSunday = easter;
  const easterMonday = addDays(easter, 1);
  const generalPrayerDay = addDays(easter, 26); // Store Bededag (abolished in 2024, but keeping for historic/config option)
  const ascensionDay = addDays(easter, 39);
  const whitSunday = addDays(easter, 49);
  const whitMonday = addDays(easter, 50);

  const holidays: HolidaySetting[] = [
    { date: `${year}-01-01`, name: 'Nytårsdag (New Year\'s Day)' },
    { date: formatDateISO(maundyThursday), name: 'Skærtorsdag (Maundy Thursday)' },
    { date: formatDateISO(goodFriday), name: 'Langfredag (Good Friday)' },
    { date: formatDateISO(easterSunday), name: 'Påskedag (Easter Sunday)' },
    { date: formatDateISO(easterMonday), name: 'Anden påskedag (Easter Monday)' },
    { date: formatDateISO(ascensionDay), name: 'Kristi Himmelfartsdag (Ascension Day)' },
    { date: formatDateISO(whitSunday), name: 'Pinsedag (Whit Sunday)' },
    { date: formatDateISO(whitMonday), name: 'Anden pinsedag (Whit Monday)' },
    { date: `${year}-06-05`, name: 'Grundlovsdag (Constitution Day)' },
    { date: `${year}-12-24`, name: 'Juleaftensdag (Christmas Eve)' },
    { date: `${year}-12-25`, name: 'Juledag (Christmas Day)' },
    { date: `${year}-12-26`, name: 'Anden juledag (2nd Christmas Day)' },
  ];

  // Store Bededag was abolished for years >= 2024
  if (year < 2024) {
    holidays.push({ date: formatDateISO(generalPrayerDay), name: 'Store Bededag (General Prayer Day)' });
  }

  // Sort chronologically
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}
