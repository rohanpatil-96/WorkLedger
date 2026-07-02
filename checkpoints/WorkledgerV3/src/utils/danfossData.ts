/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayEntry, WorkCategory } from '../types';
import { getWeekdayName, getWeekNumber, isWeekend } from './calculations';

export const DANFOSS_CSV_RAW = `23,2-6-25,08:00,16:00,8.00,Office,,32.00,29.6,2.40,2,Fridag / Company Holiday,6,,
,3-6-25,08:00,16:00,8.00,Office,,,,,,Feriedag / Vacation day,8,,
,4-6-25,08:00,16:00,8.00,Office,,,,,,Sygdom / Sick day,2,,
,5-6-25,0,0,0.00,Fridag,Grundlovsdag,,,,,Unpaid Vacation (old job),19,,
,6-6-25,08:00,16:00,8.00,WFH,Bridge day,,,,,Total days,136,,
24,9-6-25,0,0,0.00,Fridag,Pinsedag,32.00,29.6,2.40,,,,,
,10-6-25,07:45,16:30,8.75,Office,,,,,,,,,
,11-6-25,09:30,16:30,7.00,Office,,,,,,,,,
,12-6-25,08:30,16:30,8.00,Office,,,,,,,,,
,13-6-25,08:30,16:45,8.25,Office,,,,,,,,,
25,16-6-25,08:30,16:30,8.00,Office,,37.75,37,0.75,,,,,
,17-6-25,08:30,16:30,8.00,Office,,,,,,,,,
,18-6-25,08:30,16:00,7.50,Office,,,,,,,,,
,19-6-25,08:30,15:30,7.00,Office,Early: VW testdrive,,,,,,,,
,20-6-25,08:15,15:30,7.25,Office,,,,,,,,,
26,23-6-25,08:15,16:15,8.00,Office,,38.50,37,1.50,,,,,
,24-6-25,08:30,16:00,7.50,WFH,Car pick up; Skoda testdrive,,,,,,,,
,25-6-25,07:45,16:15,8.50,Office,,,,,,,,,
,26-6-25,08:30,16:00,7.50,Office,,,,,,,,,
,27-6-25,09:00,16:00,7.00,Office,,,,,,,,,
27,30-6-25,09:00,16:15,7.25,Office,,37.25,37,0.25,,,,,
,1-7-25,08:45,16:15,7.50,Office,,,,,,,,,
,2-7-25,09:00,16:15,7.25,Office,,,,,,,,,
,3-7-25,08:30,16:15,7.75,Office,,,,,,,,,
,4-7-25,08:30,16:00,7.50,WFH,,,,,,,,,
28,7-7-25,08:30,16:15,7.75,Office,,38.50,37,1.50,,,,,
,8-7-25,08:30,16:15,7.75,Office,,,,,,,,,
,9-7-25,08:30,16:45,8.25,Office,,,,,,,,,
,10-7-25,08:45,16:30,7.75,Office,,,,,,,,,
,11-7-25,09:00,16:00,7.00,Office,,,,,,,,,
29,14-7-25,08:30,16:15,7.75,Office,,36.50,37,-0.50,,,,,
,15-7-25,08:30,16:00,7.50,Office,,,,,,,,,
,16-7-25,09:00,16:30,7.50,Office,,,,,,,,,
,17-7-25,09:30,16:15,6.75,Office,,,,,,,,,
,18-7-25,09:00,16:00,7.00,Office,,,,,,,,,
30,21-7-25,08:00,16:45,8.75,Office,,36.50,37,-0.50,,,,,
,22-7-25,08:30,16:00,7.50,Office,,,,,,,,,
,23-7-25,09:00,16:00,7.00,Office,,,,,,,,,
,24-7-25,09:00,16:00,7.00,Office,,,,,,,,,
,25-7-25,08:45,15:00,6.25,Office,,,,,,,,,
31,28-7-25,,,7.40,Feriedag,Vacation,37.00,37,0.00,,,,,
,29-7-25,,,7.40,Feriedag,,,,,,,,,
,30-7-25,,,7.40,Feriedag,,,,,,,,,
,31-7-25,,,7.40,Feriedag,,,,,,,,,
,1-8-25,,,7.40,Feriedag,,,,,,,,,
32,4-8-25,x,x,7.40,Sygdom,Sick day,35.90,37,-1.10,,,,,
,5-8-25,08:30,16:15,7.75,Office,,,,,,,,,
,6-8-25,09:00,16:15,7.25,Office,,,,,,,,,
,7-8-25,09:00,16:30,7.50,Office,,,,,,,,,
,8-8-25,09:00,15:00,6.00,Office,,,,,,,,,
33,11-8-25,08:15,16:45,8.50,WFH,Kongevej House Viewing : Cancelled,40.50,37,3.50,,,,,
,12-8-25,08:15,16:45,8.50,WFH,,,,,,,,,
,13-8-25,09:00,16:45,7.75,Office,,,,,,,,,
,14-8-25,08:15,16:30,8.25,WFH,,,,,,,,,
,15-8-25,08:30,16:00,7.50,WFH,,,,,,,,,
34,18-8-25,08:30,16:30,8.00,Office,Vaasa,39.00,37,2.00,,,,,
,19-8-25,08:30,16:30,8.00,Office,Vaasa,,,,,,,,
,20-8-25,08:30,16:30,8.00,Office,Vaasa,,,,,,,,
,21-8-25,08:30,16:00,7.50,Office,Vaasa,,,,,,,,
,22-8-25,08:30,16:00,7.50,WFH,,,,,,,,,
35,25-8-25,08:30,16:30,8.00,Office,,38.00,37,1.00,,,,,
,26-8-25,08:00,16:30,8.50,WFH,,,,,,,,,
,27-8-25,09:00,16:00,7.00,WFH,,,,,,,,,
,28-8-25,08:30,16:00,7.50,Office,,,,,,,,,
,29-8-25,09:00,16:00,7.00,WFH,,,,,,,,,
36,1-9-25,08:30,16:00,7.50,WFH,,38.50,37,1.50,12,,,,
,2-9-25,08:30,16:00,7.50,WFH,,,,,,,,,
,3-9-25,08:30,16:30,8.00,Office,,,,,,,,,
,4-9-25,08:30,16:45,8.25,Office,,,,,,,,,
,5-9-25,08:30,15:45,7.25,WFH,,,,,,,,,
37,8-9-25,08:30,16:45,8.25,Office,,37.50,37,0.50,,,,,
,9-9-25,09:00,16:15,7.25,WFH,To recieve home screens (N),,,,,,,,
,10-9-25,09:00,16:00,7.00,WFH,To recieve home screens (Y),,,,,,,,
,11-9-25,08:30,17:30,9.00,Office,,,,,,,,,
,12-9-25,09:00,15:00,6.00,WFH,,,,,,,,,
38,15-9-25,08:30,17:30,9.00,Office,Danish classes start,37.50,37,0.50,,,,,
,16-9-25,09:00,16:30,7.50,Office,,,,,,,,,
,17-9-25,09:00,17:00,8.00,WFH,,,,,,,,,
,18-9-25,08:45,17:15,8.50,Office,,,,,,,,,
,19-9-25,08:00,12:30,4.50,WFH,FDM Brugtbilstest,,,,,,,,
39,22-9-25,09:00,17:00,8.00,Office,,36.50,37,-0.50,,,,,
,23-9-25,08:30,17:30,9.00,WFH,,,,,,,,,
,24-9-25,09:00,15:00,6.00,WFH,Going to Kolding Bilcenter,,,,,,,,
,25-9-25,07:45,17:45,10.00,Office,,,,,,,,,
,26-9-25,09:00,12:30,3.50,WFH,,,,,,,,,
40,29-9-25,08:30,16:00,7.50,WFH,,37.00,37,0.00,,,,,
,30-9-25,09:00,16:00,7.00,Office,Offenbach visit,,,,,,,,
,1-10-25,08:00,16:30,8.50,Office,Offenbach visit,,,,,,,,
,2-10-25,09:00,16:00,7.00,Office,Offenbach visit,,,,,,,,
,3-10-25,09:00,16:00,7.00,Office,Offenbach visit,,,,,,,,
41,6-10-25,09:00,17:00,8.00,Office,,39.25,37,2.25,,,,,
,7-10-25,08:30,17:00,8.50,WFH,,,,,,,,,
,8-10-25,08:30,16:30,8.00,WFH,,,,,,,,,
,9-10-25,08:30,17:15,8.75,Office,,,,,,,,,
,10-10-25,09:00,15:00,6.00,WFH,,,,,,,,,
42,13-10-25,09:00,16:15,7.25,WFH,,36.50,37,-0.50,,,,,
,14-10-25,08:45,16:15,7.50,Office,,,,,,,,,
,15-10-25,08:00,17:00,9.00,Office,,,,,,,,,
,16-10-25,08:45,15:30,6.75,Office,,,,,,,,,
,17-10-25,09:00,15:00,6.00,WFH,,,,,,,,,
43,20-10-25,09:00,16:00,7.00,WFH,,35.90,37,-1.10,,,,,
,21-10-25,09:00,16:15,7.25,WFH,,,,,,,,,
,22-10-25,x,x,7.40,Sygdom,,,,,,,,,
,23-10-25,08:30,16:45,8.25,Office,,,,,,,,,
,24-10-25,09:00,15:00,6.00,WFH,,,,,,,,,
44,27-10-25,07:30,16:30,9.00,Office,7am meeting with Rasmus,37.00,37,0.00,,,,,
,28-10-25,09:00,15:30,6.50,WFH,,,,,,,,,
,29-10-25,09:00,16:15,7.25,Office,,,,,,,,,
,30-10-25,09:00,16:00,7.00,WFH,,,,,,,,,
,31-10-25,08:15,15:30,7.25,Office,,,,,,,,,
45,3-11-25,08:30,15:30,7.00,Office,,36.50,37,-0.50,,,,,
,4-11-25,08:00,17:30,9.50,Office,,,,,,,,,
,5-11-25,09:00,16:00,7.00,WFH,,,,,,,,,
,6-11-25,09:00,15:30,6.50,Office,,,,,,,,,
,7-11-25,09:00,15:30,6.50,WFH,,,,,,,,,
46,10-11-25,09:00,16:30,7.50,Office,,32.90,37,-4.10,,,,,
,11-11-25,09:00,16:00,7.00,WFH,,,,,,,,,
,12-11-25,09:00,16:00,7.00,WFH,Travel to CPH,,,,,,,,
,13-11-25,09:00,13:00,4.00,Office,CPH Office- rasmus,,,,,,,,
,14-11-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
47,17-11-25,08:30,16:00,7.50,WFH,from Mumbai,39.75,37,2.75,,,,,
,18-11-25,08:30,16:00,7.50,WFH,from Mumbai,,,,,,,,
,19-11-25,08:30,16:00,7.50,WFH,from Mumbai,,,,,,,,
,20-11-25,08:00,16:45,8.75,WFH,from Mumbai,,,,,,,,
,21-11-25,08:00,16:30,8.50,WFH,from Mumbai,,,,,,,,
48,24-11-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),37.00,37,0.00,,,,,
,25-11-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
,26-11-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
,27-11-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
,28-11-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
49,1-12-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),37.00,37,0.00,,,,,
,2-12-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
,3-12-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
,4-12-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
,5-12-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
50,8-12-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),37.00,37,0.00,,,,,
,9-12-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
,10-12-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
,11-12-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
,12-12-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
51,15-12-25,08:30,16:00,7.50,WFH,,37.50,37,0.50,,,,,
,16-12-25,08:30,16:00,7.50,WFH,,,,,,,,,
,17-12-25,08:30,16:00,7.50,WFH,,,,,,,,,
,18-12-25,08:30,16:00,7.50,WFH,,,,,,,,,
,19-12-25,08:30,16:00,7.50,WFH,,,,,,,,,
52,22-12-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),37.00,37,0.00,,,,,
,23-12-25,x,x,7.40,Unpaid Ferie,Unpaid Vacation (out of 19),,,,,,,,
,24-12-25,x,x,7.40,Fridag,Christmas,,,,,,,,
,25-12-25,x,x,7.40,Fridag,Christmas,,,,,,,,
,26-12-25,x,x,7.40,Fridag,Christmas,,,,,,,,
1,29-12-25,x,x,7.40,Unpaid Ferie,Vacation,37.00,37,0.00,,,,,
,30-12-25,x,x,7.40,Feriedag,Vacation,,,,,,,,
,31-12-25,x,x,7.40,Feriedag,Vacation,,,,,,,,
,1-1-26,x,x,7.40,Fridag,NYE,,,,,,,,
,2-1-26,x,x,7.40,Feriedag,Vacation,,,,,,,,`;

export function getDanfossEntries(): DayEntry[] {
  const lines = DANFOSS_CSV_RAW.split('\n');
  const result: DayEntry[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(',');
    if (parts.length < 6) continue;

    // Date
    const rawDate = parts[1].trim();
    if (!rawDate) continue;

    // Parse DD-MM-YY or DD-MM-YYYY
    const dateParts = rawDate.split('-');
    if (dateParts.length !== 3) continue;

    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    let year = parseInt(dateParts[2], 10);
    if (year < 100) year += 2000;

    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Category mappings
    const rawLocation = parts[5].trim().toLowerCase();
    let category: WorkCategory = WorkCategory.Office;
    if (rawLocation === 'wfh') {
      category = WorkCategory.WFH;
    } else if (rawLocation === 'fridag') {
      category = WorkCategory.Holiday;
    } else if (rawLocation === 'feriedag') {
      category = WorkCategory.Vacation;
    } else if (rawLocation === 'sygdom') {
      category = WorkCategory.Sick;
    } else if (rawLocation === 'unpaid ferie') {
      category = WorkCategory.UnpaidFerie;
    }

    // Punches
    const entryTimeRaw = parts[2].trim();
    const exitTimeRaw = parts[3].trim();
    const isWorking = (category === WorkCategory.Office || category === WorkCategory.WFH);
    const hasValidTimes = (entryTimeRaw !== '' && entryTimeRaw !== '0' && entryTimeRaw !== 'x' && exitTimeRaw !== '' && exitTimeRaw !== '0' && exitTimeRaw !== 'x');

    const entryTime = hasValidTimes ? entryTimeRaw : undefined;
    const exitTime = hasValidTimes ? exitTimeRaw : undefined;

    // Hours
    const rawHours = parseFloat(parts[4].trim()) || 0;
    const notes = parts[6] ? parts[6].trim() : '';

    // Calculate Overtime
    const isWk = isWeekend(formattedDate);
    
    // In standard parsed sheets, Fridag, Sygdom, Feriedag, Unpaid Ferie count with 7.4 to match expected total and make overtime 0.
    // If we want exact matches of calculations:
    let finalCountedHours = rawHours;
    let overtime = 0;

    if (category === WorkCategory.Holiday || category === WorkCategory.Vacation || category === WorkCategory.Sick || category === WorkCategory.UnpaidFerie) {
      finalCountedHours = 7.4;
      overtime = 0;
    } else {
      overtime = parseFloat((finalCountedHours - 7.4).toFixed(2));
    }

    result.push({
      date: formattedDate,
      weekday: getWeekdayName(formattedDate),
      weekNumber: getWeekNumber(formattedDate),
      month,
      year,
      category,
      entryTime,
      exitTime,
      breakMinutes: hasValidTimes ? 0 : undefined, // Danfoss sheet tracks raw hours difference between entry and exit with no break subtracted
      calculatedHours: finalCountedHours,
      finalCountedHours,
      overtime,
      notes,
      createdUpdatedTimestamp: new Date().toISOString()
    });
  }

  // Sort chronological
  return result.sort((a, b) => b.date.localeCompare(a.date));
}
