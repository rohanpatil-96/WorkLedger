/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { DayEntry, WorkCategory, UserSettings, getCategoryDisplayName } from '../types';
import { calculateCommuteDeduction, isWeekend, getCommuteDistance } from '../utils/calculations';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Printer,
  Copy,
  Calendar,
  Layers,
  Coins,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Briefcase
} from 'lucide-react';

// @ts-ignore
import pdfMake from 'pdfmake/build/pdfmake';
// @ts-ignore
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Register standard fonts with robust fallback for different bundler/vfs_fonts module export formats
if (pdfMake && pdfFonts) {
  const vfs = (pdfFonts as any).pdfMake?.vfs || (pdfFonts as any).vfs || pdfFonts;
  if (vfs) {
    (pdfMake as any).vfs = vfs;
  }
}

interface ReportsViewProps {
  entries: DayEntry[];
  settings: UserSettings;
}

export default function ReportsView({ entries, settings }: ReportsViewProps) {
  const currentLocalTime = new Date();
  const activeYear = currentLocalTime.getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(activeYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentLocalTime.getMonth() + 1);
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('yearly');

  // Copy success indicator
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [showChronologicalStatement, setShowChronologicalStatement] = useState<boolean>(false);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  // Filter lists based on preferences
  const yearEntries = useMemo(() => {
    return entries.filter((e) => e.year === selectedYear);
  }, [entries, selectedYear]);

  const reportEntries = useMemo(() => {
    if (reportType === 'monthly') {
      return yearEntries.filter((e) => e.month === selectedMonth).sort((a, b) => a.date.localeCompare(b.date));
    }
    return [...yearEntries].sort((a, b) => a.date.localeCompare(b.date));
  }, [yearEntries, reportType, selectedMonth]);

  const statementEntries = useMemo(() => {
    return reportEntries.filter((e) => 
      e.category === WorkCategory.Office || 
      (e.category === WorkCategory.OtherOffice && getCommuteDistance(e, settings) > 0)
    );
  }, [reportEntries, settings]);

  // Count by category helper
  const countByCategory = (list: DayEntry[], cat: WorkCategory) =>
    list.filter((e) => e.category === cat).length;

  const wfhDaysCount = useMemo(() => countByCategory(reportEntries, WorkCategory.WFH), [reportEntries]);
  const officeDaysCount = useMemo(() => countByCategory(reportEntries, WorkCategory.Office), [reportEntries]);
  const otherOfficeDaysCount = useMemo(() => countByCategory(reportEntries, WorkCategory.OtherOffice), [reportEntries]);
  const vacationDaysCount = useMemo(() => countByCategory(reportEntries, WorkCategory.Vacation), [reportEntries]);
  const sickDaysCount = useMemo(() => countByCategory(reportEntries, WorkCategory.Sick), [reportEntries]);
  const holidaysCount = useMemo(() => countByCategory(reportEntries, WorkCategory.Holiday), [reportEntries]);
  const unpaidCount = useMemo(() => countByCategory(reportEntries, WorkCategory.UnpaidFerie), [reportEntries]);

  // Commute tax settings
  const activeTaxSetting = useMemo(() => {
    return settings.taxRates.find((t) => t.year === selectedYear) || {
      year: selectedYear,
      thresholdKm: 24,
      rate1: 2.28,
      rate2: 1.14,
      limitKm: 120
    };
  }, [settings, selectedYear]);

  const deductionPerDay = useMemo(() => {
    return calculateCommuteDeduction(Number(settings.roundTripDistanceKm || 0), activeTaxSetting);
  }, [settings, activeTaxSetting]);

  const commuteDaysCount = useMemo(() => {
    return reportEntries.filter((e) => getCommuteDistance(e, settings) > 0).length;
  }, [reportEntries, settings]);

  const estimatedDeductionSum = useMemo(() => {
    return reportEntries.reduce((acc, e) => {
      const dist = getCommuteDistance(e, settings);
      return acc + calculateCommuteDeduction(dist, activeTaxSetting);
    }, 0);
  }, [reportEntries, settings, activeTaxSetting]);

  const totalHoursCounted = useMemo(() => {
    return reportEntries.reduce((acc, e) => acc + e.finalCountedHours, 0);
  }, [reportEntries]);

  const overtimeSumValue = useMemo(() => {
    return reportEntries.reduce((acc, e) => acc + e.overtime, 0);
  }, [reportEntries]);

  // --- DOWNLOAD CSV HANDLER ---
  const handleExportCSV = () => {
    let csvContent = '\uFEFF'; // BOM to preserve Danish characters
    csvContent += 'Date,Weekday,Week,Month,Year,Category,EntryTime,ExitTime,BreakMinutes,CalculatedHours,FinalCountedHours,OvertimeShift,Notes\n';

    reportEntries.forEach((e) => {
      const notesClean = (e.notes || '').replace(/"/g, '""');
      csvContent += `${e.date},${e.weekday},${e.weekNumber},${e.month},${e.year},"${e.category}",${e.entryTime || ''},${e.exitTime || ''},${e.breakMinutes ?? ''},${e.calculatedHours},${e.finalCountedHours},${e.overtime},"${notesClean}"\n`;
    });

    const filename = `danish_workdays_report_${reportType}_${selectedYear}${reportType === 'monthly' ? '_' + selectedMonth : ''}.csv`;

    if (Capacitor.isNativePlatform()) {
      Filesystem.writeFile({
        path: filename,
        data: csvContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      }).then((writeResult) => {
        Share.share({
          title: 'WorkLedger CSV Report',
          text: `Danish workdays and commute logs for ${reportType === 'monthly' ? monthsNames[selectedMonth - 1] : ''} ${selectedYear}`,
          url: writeResult.uri,
          dialogTitle: 'Save or Share CSV Report'
        });
      }).catch((nativeErr) => {
        console.error('Capacitor CSV share failed, falling back to browser download:', nativeErr);
        triggerBrowserDownload();
      });
    } else {
      triggerBrowserDownload();
    }

    function triggerBrowserDownload() {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // --- TAB-DELIMITED (GOOGLE SHEETS COMPATIBLE) ---
  const handleCopyTSV = () => {
    let tsv = 'Date\tWeekday\tWeek\tCategory\tEntry\tExit\tBreak\tHours\tOvertime\tNotes\n';

    reportEntries.forEach((e) => {
      tsv += `${e.date}\t${e.weekday}\t${e.weekNumber}\t${e.category}\t${e.entryTime || ''}\t${e.exitTime || ''}\t${e.breakMinutes ?? ''}\t${e.finalCountedHours}\t${e.overtime}\t${e.notes || ''}\n`;
    });

    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2000);
    });
  };

  const handlePrintPDF = async () => {
    if (generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      
      // Group entries by month
      const groups: { [key: number]: DayEntry[] } = {};
      statementEntries.forEach((e) => {
        if (!groups[e.month]) {
          groups[e.month] = [];
        }
        groups[e.month].push(e);
      });

      const sortedMonths = Object.keys(groups)
        .map(Number)
        .sort((a, b) => a - b);

      const content: any[] = [
        {
          text: 'Official Ledger & Audit Trail'.toUpperCase(),
          fontSize: 8,
          bold: true,
          color: '#A27B5B',
          margin: [0, 0, 0, 4]
        },
        {
          text: 'Denmark Workday Hours & Commute Log',
          fontSize: 18,
          bold: true,
          color: '#2C3639',
          margin: [0, 0, 0, 4]
        },
        {
          text: [
            { text: 'Statement Timeframe: ', fontSize: 9, color: '#8C7C6B' },
            { text: reportType === 'monthly' ? `${monthsNames[selectedMonth - 1]} ${selectedYear}` : `Full Calendar ${selectedYear}`, fontSize: 9, bold: true, color: '#2C3639' }
          ],
          margin: [0, 0, 0, 15]
        },
        // User Info Table
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                {
                  fillColor: '#FAF8F5',
                  borderColor: ['#DFD7C9', '#DFD7C9', '#DFD7C9', '#DFD7C9'],
                  border: [true, true, true, true],
                  margin: [10, 8, 10, 8],
                  stack: [
                    { text: 'LEDGER SUBJECT', fontSize: 7, bold: true, color: '#8C7C6B' },
                    { text: settings.userName || 'Your Name', fontSize: 10, bold: true, color: '#2C3639', margin: [0, 4, 0, 2] },
                    { text: settings.userEmail || (settings.userName ? `${settings.userName.toLowerCase().replace(/\s+/g, '')}@email.com` : 'your-email@email.com'), fontSize: 8, color: '#8C7C6B' }
                  ]
                },
                {
                  fillColor: '#FAF8F5',
                  borderColor: ['#DFD7C9', '#DFD7C9', '#DFD7C9', '#DFD7C9'],
                  border: [true, true, true, true],
                  margin: [10, 8, 10, 8],
                  stack: [
                    { text: 'EMPLOYER COMPLIANCE', fontSize: 7, bold: true, color: '#8C7C6B' },
                    { text: settings.activeCompany || 'Your Company', fontSize: 10, bold: true, color: '#2C3639', margin: [0, 4, 0, 2] },
                    { text: 'Active Hybrid Work Schema', fontSize: 8, color: '#2E7D32', bold: true }
                  ]
                },
                {
                  fillColor: '#FAF8F5',
                  borderColor: ['#DFD7C9', '#DFD7C9', '#DFD7C9', '#DFD7C9'],
                  border: [true, true, true, true],
                  margin: [10, 8, 10, 8],
                  stack: [
                    { text: 'REGULATORY SCHEME', fontSize: 7, bold: true, color: '#8C7C6B' },
                    { text: 'SKAT (Danish Tax Agency)', fontSize: 10, bold: true, color: '#2C3639', margin: [0, 4, 0, 2] },
                    { text: 'Section 9 C (Befordringsfradrag)', fontSize: 8, color: '#A27B5B', bold: true }
                  ]
                }
              ]
            ]
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#DFD7C9',
            vLineColor: () => '#DFD7C9'
          },
          margin: [0, 0, 0, 15]
        },
        // Summary Cards Table
        {
          table: {
            widths: ['*', '*', '*', '*'],
            body: [
              [
                {
                  fillColor: '#FAF8F5',
                  borderColor: ['#DFD7C9', '#DFD7C9', '#DFD7C9', '#DFD7C9'],
                  border: [true, true, true, true],
                  margin: [8, 8, 8, 8],
                  stack: [
                    { text: 'TOTAL HOURS', fontSize: 7, bold: true, color: '#8C7C6B' },
                    { text: `${totalHoursCounted.toFixed(2)} hrs`, fontSize: 11, bold: true, color: '#2C3639', margin: [0, 4, 0, 2] },
                    { text: 'Total hours counted', fontSize: 7, color: '#8C7C6B' }
                  ]
                },
                {
                  fillColor: '#FAF8F5',
                  borderColor: ['#DFD7C9', '#DFD7C9', '#DFD7C9', '#DFD7C9'],
                  border: [true, true, true, true],
                  margin: [8, 8, 8, 8],
                  stack: [
                    { text: 'OVERTIME SUMMARY', fontSize: 7, bold: true, color: '#8C7C6B' },
                    { text: `${overtimeSumValue >= 0 ? '+' : ''}${overtimeSumValue.toFixed(2)} hrs`, fontSize: 11, bold: true, color: overtimeSumValue >= 0 ? '#73825E' : '#C62828', margin: [0, 4, 0, 2] },
                    { text: 'Overtime balance', fontSize: 7, color: '#8C7C6B' }
                  ]
                },
                {
                  fillColor: '#FAF8F5',
                  borderColor: ['#DFD7C9', '#DFD7C9', '#DFD7C9', '#DFD7C9'],
                  border: [true, true, true, true],
                  margin: [8, 8, 8, 8],
                  stack: [
                    { text: 'ELIGIBLE SKAT DAYS', fontSize: 7, bold: true, color: '#8C7C6B' },
                    { text: `${commuteDaysCount} days`, fontSize: 11, bold: true, color: '#2C3639', margin: [0, 4, 0, 2] },
                    { text: 'Eligible office days', fontSize: 7, color: '#8C7C6B' }
                  ]
                },
                {
                  fillColor: '#FAF8F5',
                  borderColor: ['#DFD7C9', '#DFD7C9', '#DFD7C9', '#DFD7C9'],
                  border: [true, true, true, true],
                  margin: [8, 8, 8, 8],
                  stack: [
                    { text: 'EST. SKAT DEDUCTION', fontSize: 7, bold: true, color: '#8C7C6B' },
                    { text: `${estimatedDeductionSum.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DKK`, fontSize: 10, bold: true, color: '#2C3639', margin: [0, 4, 0, 2] },
                    { text: 'Estimated deduction', fontSize: 7, color: '#8C7C6B' }
                  ]
                }
              ]
            ]
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#DFD7C9',
            vLineColor: () => '#DFD7C9'
          },
          margin: [0, 0, 0, 15]
        },
        // Detailed Category Counter Block
        {
          stack: [
            { text: 'DETAILED CATEGORY COUNTER', fontSize: 8, bold: true, color: '#2C3639', margin: [0, 0, 0, 6] },
            {
              table: {
                widths: ['*', '*', '*', '*', '*', '*', '*'],
                body: [
                  [
                    { text: 'Office', fontSize: 7, bold: true, color: '#8C7C6B', alignment: 'center', fillColor: '#FAF8F5' },
                    { text: 'WFH', fontSize: 7, bold: true, color: '#8C7C6B', alignment: 'center', fillColor: '#FAF8F5' },
                    { text: 'Diff Branch', fontSize: 7, bold: true, color: '#8C7C6B', alignment: 'center', fillColor: '#FAF8F5' },
                    { text: 'Paid Holiday', fontSize: 7, bold: true, color: '#8C7C6B', alignment: 'center', fillColor: '#FAF8F5' },
                    { text: 'Sick Day', fontSize: 7, bold: true, color: '#8C7C6B', alignment: 'center', fillColor: '#FAF8F5' },
                    { text: 'Holiday', fontSize: 7, bold: true, color: '#8C7C6B', alignment: 'center', fillColor: '#FAF8F5' },
                    { text: 'Unpaid Holiday', fontSize: 7, bold: true, color: '#8C7C6B', alignment: 'center', fillColor: '#FAF8F5' }
                  ],
                  [
                    { text: `${officeDaysCount} d`, fontSize: 10, bold: true, color: '#2C3639', alignment: 'center', fillColor: '#FAF8F5' },
                    { text: `${wfhDaysCount} d`, fontSize: 10, bold: true, color: '#2C3639', alignment: 'center', fillColor: '#FAF8F5' },
                    { text: `${otherOfficeDaysCount} d`, fontSize: 10, bold: true, color: '#2C3639', alignment: 'center', fillColor: '#FAF8F5' },
                    { text: `${vacationDaysCount} d`, fontSize: 10, bold: true, color: '#2C3639', alignment: 'center', fillColor: '#FAF8F5' },
                    { text: `${sickDaysCount} d`, fontSize: 10, bold: true, color: '#2C3639', alignment: 'center', fillColor: '#FAF8F5' },
                    { text: `${holidaysCount} d`, fontSize: 10, bold: true, color: '#2C3639', alignment: 'center', fillColor: '#FAF8F5' },
                    { text: `${unpaidCount} d`, fontSize: 10, bold: true, color: '#2C3639', alignment: 'center', fillColor: '#FAF8F5' }
                  ]
                ]
              },
              layout: {
                hLineWidth: (i: number) => (i === 0 || i === 2) ? 1 : 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#DFD7C9',
                vLineColor: () => '#DFD7C9'
              }
            }
          ],
          margin: [0, 0, 0, 15]
        },
        // Commute tax calculation method
        {
          fillColor: '#F3EFE9',
          table: {
            widths: ['*'],
            body: [
              [
                {
                  margin: [12, 10, 12, 10],
                  stack: [
                    { text: 'COMMUTE TAX CALCULATION METHOD (DANISH SKAT RULES)', fontSize: 8, bold: true, color: '#2C3639', margin: [0, 0, 0, 6] },
                    {
                      text: [
                        { text: 'The commute deduction estimate is calculated dynamically based on Danish tax laws for ', italic: true },
                        { text: `${selectedYear}`, bold: true, italic: true },
                        { text: ' for high-integrity audit logs:', italic: true }
                      ],
                      fontSize: 8,
                      color: '#2C3639',
                      margin: [0, 0, 0, 6]
                    },
                    {
                      ul: [
                        {
                          text: [
                            { text: 'Default Office (', italic: true },
                            { text: `${settings.defaultOfficeLocationName || 'Default Office Location'}`, bold: true, italic: true },
                            { text: ') round-trip distance checked is: ', italic: true },
                            { text: `${settings.roundTripDistanceKm} km`, bold: true, italic: true },
                            { text: '.', italic: true }
                          ]
                        },
                        {
                          text: [
                            { text: 'First ', italic: true },
                            { text: '24 km', bold: true, italic: true },
                            { text: ' of any commute gets no refund. Deductible distance: ', italic: true },
                            { text: `${Math.max(0, Number(settings.roundTripDistanceKm || 0) - 24)} km`, bold: true, italic: true },
                            { text: ' / default commuter day.', italic: true }
                          ]
                        },
                        {
                          text: [
                            { text: 'Portion ', italic: true },
                            { text: '25 - 120 km', bold: true, italic: true },
                            { text: ' rate is: ', italic: true },
                            { text: `${activeTaxSetting.rate1} DKK/km`, bold: true, italic: true },
                            { text: '.', italic: true }
                          ]
                        },
                        {
                          text: [
                            { text: 'Portion above ', italic: true },
                            { text: '120 km', bold: true, italic: true },
                            { text: ' rate is: ', italic: true },
                            { text: `${activeTaxSetting.rate2} DKK/km`, bold: true, italic: true },
                            { text: '.', italic: true }
                          ]
                        },
                        {
                          text: [
                            { text: 'Different office locations: ', bold: true, italic: true },
                            { text: 'Included dynamically if enabled in settings, using their specific round-trip distances.', italic: true }
                          ]
                        },
                        {
                          text: [
                            { text: 'Exclusions: ', bold: true, italic: true },
                            { text: 'Saturdays/Sundays, Sick spells, Paid Holiday, non-commute remote locations, and Work-from-Home days.', italic: true }
                          ]
                        }
                      ],
                      fontSize: 8,
                      color: '#2C3639'
                    }
                  ]
                }
              ]
            ]
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#DFD7C9',
            vLineColor: () => '#DFD7C9'
          },
          margin: [0, 0, 0, 15]
        },
        // Force break to start the table on page 2
        { text: '', pageBreak: 'before' },
        { text: 'Chronological Statement of Workdays (Office Commutes Only)'.toUpperCase(), fontSize: 10, bold: true, color: '#2C3639', margin: [0, 0, 0, 10], keepWithNext: true }
      ];

      // Add monthly tables
      if (sortedMonths.length === 0) {
        content.push({
          text: 'No office commute entries recorded in the selected timeframe.',
          fontSize: 9,
          italic: true,
          alignment: 'center',
          margin: [0, 20, 0, 20]
        } as any);
      } else {
        sortedMonths.forEach((m) => {
          const monthName = monthsNames[m - 1];
          const groupEntries = groups[m].sort((a, b) => a.date.localeCompare(b.date));

          content.push({
            keepTogether: true,
            stack: [
              {
                columns: [
                  { text: `${monthName.toUpperCase()} ${selectedYear}`, fontSize: 10, bold: true, color: '#2C3639' },
                  { text: `${groupEntries.length} office / commute ${groupEntries.length === 1 ? 'day' : 'days'}`, fontSize: 8, bold: true, color: '#8C7C6B', alignment: 'right' }
                ],
                margin: [0, 10, 0, 6]
              },
              {
                table: {
                  headerRows: 1,
                  widths: ['15%', '13%', '8%', '16%', '12%', '*'],
                  body: [
                    [
                      { text: 'Date', bold: true, fontSize: 8, color: '#2C3639', fillColor: '#F3EFE9' },
                      { text: 'Weekday', bold: true, fontSize: 8, color: '#2C3639', fillColor: '#F3EFE9' },
                      { text: 'Week', bold: true, fontSize: 8, color: '#2C3639', fillColor: '#F3EFE9', alignment: 'center' },
                      { text: 'Worked Hours', bold: true, fontSize: 8, color: '#2C3639', fillColor: '#F3EFE9', alignment: 'center' },
                      { text: 'Overtime', bold: true, fontSize: 8, color: '#2C3639', fillColor: '#F3EFE9', alignment: 'center' },
                      { text: 'Notes', bold: true, fontSize: 8, color: '#2C3639', fillColor: '#F3EFE9' }
                    ],
                    ...groupEntries.map((e) => {
                      const otColor = e.overtime > 0 ? '#73825E' : e.overtime < 0 ? '#D32F2F' : '#9E9E9E';
                      const otText = e.overtime >= 0 ? `+${e.overtime.toFixed(2)}` : e.overtime.toFixed(2);
                      return [
                        { text: e.date, fontSize: 8, color: '#2C3639', bold: true },
                        { text: e.weekday, fontSize: 8, color: '#2C3639', bold: true },
                        { text: `W${e.weekNumber}`, fontSize: 8, color: '#2C3639', bold: true, alignment: 'center' },
                        { text: `${e.finalCountedHours.toFixed(2)} hrs`, fontSize: 8, color: '#2C3639', bold: true, alignment: 'center' },
                        { text: otText, fontSize: 8, color: otColor, bold: true, alignment: 'center' },
                        {
                          text: [
                            e.category === WorkCategory.OtherOffice ? { text: `[Diff Office${e.location ? ': ' + e.location : ''}] `, color: '#6366F1', bold: true, fontSize: 7.5 } : null,
                            { text: e.notes || '—', fontSize: 8, color: '#5C4D3C', italic: true }
                          ].filter(Boolean)
                        }
                      ];
                    })
                  ]
                },
                layout: {
                  hLineWidth: function(i: number, node: any) { return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5; },
                  vLineWidth: () => 0,
                  hLineColor: (i: number) => i === 1 ? '#DFD7C9' : '#E2E8F0'
                },
                margin: [0, 0, 0, 15]
              }
            ]
          } as any);
        });
      }

      const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 50, 40, 50],
        header: function(currentPage: number) {
          if (currentPage === 1) return null;
          return {
            margin: [40, 20, 40, 0],
            stack: [
              {
                columns: [
                  { text: 'WorkLedger', bold: true, fontSize: 9, color: '#2C3639' },
                  { text: 'OFFICIAL TIME & COMMUTE LEDGER', alignment: 'right', fontSize: 8, color: '#A27B5B', bold: true }
                ]
              },
              {
                canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 0.5, strokeColor: '#DFD7C9' }]
              }
            ]
          };
        },
        footer: function(currentPage: number, pageCount: number) {
          return {
            margin: [40, 10, 40, 20],
            stack: [
              {
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, strokeColor: '#DFD7C9' }]
              },
              {
                margin: [0, 5, 0, 0],
                columns: [
                  { text: `Generated by WorkLedger Denmark • Report Date: ${todayStr}`, fontSize: 7, italic: true, color: '#8C7C6B' },
                  { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 7, color: '#8C7C6B' }
                ]
              }
            ]
          };
        },
        content: content
      };

      const filename = `danish_workdays_report_${reportType}_${selectedYear}${reportType === 'monthly' ? '_' + selectedMonth : ''}.pdf`;
      
      if (Capacitor.isNativePlatform()) {
        (pdfMake.createPdf(docDefinition) as any).getBase64(async (base64Data: string) => {
          try {
            const writeResult = await Filesystem.writeFile({
              path: filename,
              data: base64Data,
              directory: Directory.Cache
            });

            await Share.share({
              title: 'WorkLedger PDF Report',
              text: `Danish tax & commute statement for ${reportType === 'monthly' ? monthsNames[selectedMonth - 1] : ''} ${selectedYear}`,
              url: writeResult.uri,
              dialogTitle: 'Save or Share PDF Report'
            });
          } catch (nativeErr) {
            console.error('Capacitor PDF share failed, falling back to browser download:', nativeErr);
            pdfMake.createPdf(docDefinition).download(filename);
          }
        });
      } else {
        pdfMake.createPdf(docDefinition).download(filename);
      }
    } catch (e) {
      console.error('PDF generation error:', e);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const monthsNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="reports-exporting-workspace">
      {/* Configuration Widget Controls */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-brand-slate flex items-center gap-2">
            <FileText className="text-brand-blue" />
            <span>Generate Workday Statements</span>
          </h3>
          <p className="text-xs text-slate-500">
            Export schedules to CSV, copy directly into Google Sheets, or print structured tax statements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Report Scope Selector */}
          <div className="bg-slate-100 p-1 border border-slate-200 rounded-xl flex">
            <button
              onClick={() => setReportType('yearly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                reportType === 'yearly' ? 'bg-brand-blue text-white' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Year scope
            </button>
            <button
              onClick={() => setReportType('monthly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                reportType === 'monthly' ? 'bg-brand-blue text-white' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Month scope
            </button>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value={2026}>2026 Tax Year: 2.28 kr</option>
            <option value={2025}>2025 Tax Year: 2.23 kr</option>
          </select>

          {reportType === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {monthsNames.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Printable Report Canvas Frame */}
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-7"
        id="printable-auditable-report-canvas"
      >
        <div className="space-y-7">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-brand-peach uppercase tracking-wider block">
                          Official Ledger & Audit Trail
                        </span>
                        <h2 className="text-xl md:text-2xl font-serif text-brand-slate dark:text-white tracking-tight leading-tight print-text-primary">
                          Denmark Workday Hours & Commute Log
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-slate-505 dark:text-slate-400 mt-1">
                          <span>Statement Timeframe:</span>
                          <strong className="text-slate-700 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded font-mono text-[11px] print-inner-card">
                            {reportType === 'monthly' ? `${monthsNames[selectedMonth - 1]} ` : 'Full Calendar '}{selectedYear}
                          </strong>
                        </div>
                      </div>
                      
                      <div className="text-right text-[10px] text-slate-400 font-mono tracking-wider hidden print:block">
                        SECURE DECENTRALIZED COMPLIANCE RECORD
                      </div>
                    </div>

                    {/* Premium User Information Info Grid - HIDDEN IN APP BUILD, preserved only in printed documents */}
                    <div className="hidden print:grid grid-cols-3 gap-3 mt-6 border-t border-slate-100 dark:border-slate-800/50 pt-5 text-xs print-grid-3">
                      <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between print-inverted-window">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-500 block mb-1">LEDGER SUBJECT</span>
                        <div>
                          <strong className="text-slate-800 dark:text-white font-bold block text-[13px]">{settings.userName || 'Your Name'}</strong>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px] mt-0.5">{settings.userEmail || (settings.userName ? `${settings.userName.toLowerCase().replace(/\s+/g, '')}@email.com` : 'your-email@email.com')}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between print-inverted-window">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-500 block mb-1">EMPLOYER COMPLIANCE</span>
                        <div>
                          <strong className="text-slate-800 dark:text-white font-bold block text-[13px]">{settings.activeCompany || 'Your Company'}</strong>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold block text-[10px] mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                            Active Hybrid Work Schema
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between print-inverted-window">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-500 block mb-1">REGULATORY SCHEME</span>
                        <div>
                          <strong className="text-slate-800 dark:text-white font-bold block text-[13px]">SKAT (Danish Tax Agency)</strong>
                          <span className="text-brand-peach font-bold block text-[10px] mt-0.5">Section 9 C (Befordringsfradrag)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Categories Ledger overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print-grid-4">
                    {/* Total Hours Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden print-inverted-window print-avoid-break">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/5 rounded-full blur-xl pointer-events-none" />
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Hours</span>
                        <span className="bg-brand-blue/10 text-brand-blue p-1.5 rounded-lg shrink-0">
                          <Clock className="w-4 h-4" />
                        </span>
                      </div>
                      <div>
                        <span className="text-2xl font-extrabold text-[#2C3639] font-mono tracking-tight block">
                          {totalHoursCounted.toFixed(2)} <span className="text-xs font-normal text-slate-500">hrs</span>
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total hours counted</span>
                      </div>
                    </div>

                    {/* Overtime Summary Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden print-inverted-window print-avoid-break">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 cursor-help" title="Negative overtime on Unpaid Holiday days reflects unworked standard hours per SKAT rules.">
                          Overtime Summary <span className="text-slate-400 text-[10px]">ⓘ</span>
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-600 p-1.5 rounded-lg shrink-0">
                          <Clock className="w-4 h-4" />
                        </span>
                      </div>
                      <div>
                        <span className={`text-2xl font-extrabold font-mono tracking-tight block ${overtimeSumValue >= 0 ? 'text-[#73825E]' : 'text-rose-600'}`}>
                          {overtimeSumValue >= 0 ? `+${overtimeSumValue.toFixed(2)}` : overtimeSumValue.toFixed(2)} <span className="text-xs font-normal text-slate-500">hrs</span>
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Overtime balance</span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic leading-snug border-t border-slate-100 pt-2">
                        * Negative overtime on Unpaid Holiday days reflects unworked standard hours per SKAT rules.
                      </p>
                    </div>

                    {/* Eligible SKAT Days Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden print-inverted-window print-avoid-break">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Eligible SKAT Days</span>
                        <span className="bg-indigo-500/10 text-indigo-600 p-1.5 rounded-lg shrink-0">
                          <Briefcase className="w-4 h-4" />
                        </span>
                      </div>
                      <div>
                        <span className="text-2xl font-extrabold text-[#2C3639] font-mono tracking-tight block">
                          {commuteDaysCount} <span className="text-xs font-normal text-slate-500">days</span>
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Eligible office days</span>
                      </div>
                    </div>

                    {/* Est. SKAT Deduction Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden print-inverted-window print-avoid-break">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. SKAT Deduction</span>
                        <span className="bg-amber-500/10 text-amber-600 p-1.5 rounded-lg shrink-0">
                          <Coins className="w-4 h-4" />
                        </span>
                      </div>
                      <div>
                        <span className="text-2xl font-extrabold text-[#3F4E4F] font-mono tracking-tight block">
                          {estimatedDeductionSum.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                          <span className="text-xs font-normal text-slate-500">DKK</span>
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Estimated deduction</span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Category counter block */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm print-inverted-window print-avoid-break">
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-brand-blue" />
                      <span>Detailed Category Counter</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 print-grid-7">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-blue shrink-0" />
                          <span className="truncate">Office</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {officeDaysCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                          <span className="truncate">WFH</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {wfhDaysCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                          <span className="truncate">Diff Branch</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {otherOfficeDaysCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-green shrink-0" />
                          <span className="truncate">Paid Holiday</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {vacationDaysCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-peach shrink-0" />
                          <span className="truncate">Sick Day</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {sickDaysCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                          <span className="truncate">Holiday</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {holidaysCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 shadow-xs print-inner-card">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                          <span className="truncate">Unpaid</span>
                        </div>
                        <div className="font-mono text-base font-extrabold text-slate-800 print-text-primary">
                          {unpaidCount} <span className="text-xs font-medium text-slate-400">days</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Forced page break for clean print layout split */}
                  <div className="hidden print:block print-page-break" />

                {/* Commute explanation block */}
                <div className="bg-[#DCD7C9] p-6 rounded-2xl border border-[#DFD7C9] shadow-sm space-y-3 print-inverted-window print-avoid-break font-sans text-[#2C3639]">
                  <div className="text-xs font-bold text-[#2C3639] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Coins className="w-4 h-4 text-[#2C3639] shrink-0" /> Commute Tax Calculation Method (Danish SKAT rules)
                  </div>
                  <p className="text-xs text-[#2C3639] leading-relaxed font-sans">
                    The commute deduction estimate is calculated dynamically based on Danish tax laws for {selectedYear} for high-integrity audit logs:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#2C3639] font-sans">
                    <li className="font-sans">Default Office ({settings.defaultOfficeLocationName || 'Default Office Location'}) round-trip distance checked is: <strong className="text-[#2C3639] font-bold font-sans">{settings.roundTripDistanceKm} km</strong>.</li>
                    <li className="font-sans">First 24 km of any commute gets no refund. Deductible distance: <strong className="text-[#2C3639] font-bold font-sans">{Math.max(0, Number(settings.roundTripDistanceKm || 0) - 24)} km / default commuter day</strong>.</li>
                    <li className="font-sans">Portion 25 - 120 km rate is: <strong className="text-[#2C3639] font-bold font-sans">{activeTaxSetting.rate1} DKK/km</strong>.</li>
                    <li className="font-sans">Portion above 120 km rate is: <strong className="text-[#2C3639] font-bold font-sans">{activeTaxSetting.rate2} DKK/km</strong>.</li>
                    <li className="font-sans">Different office locations: <strong className="text-[#2C3639] font-bold font-sans">Included dynamically</strong> if enabled in settings, using their specific round-trip distances.</li>
                    <li className="font-sans">Exclusions: Saturdays/Sundays, Sick spells, Paid Holiday, non-commute remote locations, and Work-from-Home days.</li>
                  </ul>
                </div>

                {/* Primary Export Actions Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden my-6" id="reports-quick-actions-bar">
                  <button
                    onClick={handleExportCSV}
                    className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition text-left text-xs group shadow-sm"
                  >
                    <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue group-hover:bg-brand-blue/20 transition">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-brand-slate block">Download Raw CSV</span>
                      <span className="text-[10px] text-slate-500">Preserves Danish characters</span>
                    </div>
                  </button>

                  <button
                    onClick={handleCopyTSV}
                    className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition text-left text-xs group shadow-sm"
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-brand-green group-hover:bg-emerald-100 transition">
                      {copiedStatus ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-emerald-700" />}
                    </div>
                    <div>
                      <span className="font-bold text-brand-slate block">{copiedStatus ? 'Copied To Clipboard!' : 'Copy to Google Sheets'}</span>
                      <span className="text-[10px] text-slate-500">Clipboard-ready tab data</span>
                    </div>
                  </button>

                  <button
                    onClick={handlePrintPDF}
                    disabled={generatingPdf}
                    className={`bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition text-left text-xs group shadow-sm ${generatingPdf ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="p-2.5 rounded-xl bg-brand-peach/10 text-amber-700 group-hover:bg-brand-peach/20 transition">
                      <Printer className={`w-5 h-5 ${generatingPdf ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <span className="font-bold text-brand-slate block">
                        {generatingPdf ? 'Generating PDF...' : 'Print PDF Statement'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {generatingPdf ? 'Assembling document...' : 'Pre-styled tax audit page'}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Items tabular statement report list */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 print:border-none print:pt-0">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 print:hidden animate-fade-in">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      Chronological Statement of Workdays
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-205 dark:border-slate-705 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl shadow-xs select-none">
                        📊 {statementEntries.length} office & commute days recorded
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowChronologicalStatement(!showChronologicalStatement)}
                        className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-205 dark:border-slate-705 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs select-none"
                      >
                        <span>{showChronologicalStatement ? 'Hide Statement' : 'Show Statement'}</span>
                        {showChronologicalStatement ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest hidden print:block">
                    Chronological Statement of Workdays (Office Commutes Only)
                  </h4>

                  <div className={`${showChronologicalStatement ? 'block' : 'hidden print:block'} space-y-6`}>
                    {useMemo(() => {
                      const groups: { [key: number]: DayEntry[] } = {};
                      statementEntries.forEach((e) => {
                        if (!groups[e.month]) {
                          groups[e.month] = [];
                        }
                        groups[e.month].push(e);
                      });

                      return Object.keys(groups)
                        .map(Number)
                        .sort((a, b) => a - b)
                        .map((m) => ({
                          monthNum: m,
                          monthName: monthsNames[m - 1],
                          entries: groups[m].sort((a, b) => a.date.localeCompare(b.date))
                        }));
                    }, [statementEntries]).map((group) => (
                      <div 
                        key={group.monthNum} 
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-5 shadow-xs print-inverted-window space-y-3 print-avoid-break print:break-inside-avoid"
                      >
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2">
                          <h5 className="font-semibold text-sm text-brand-slate dark:text-white uppercase tracking-wider print:text-white font-serif">
                            {group.monthName} {selectedYear}
                          </h5>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-105 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold print-inner-card">
                            {group.entries.length} office / commute {group.entries.length === 1 ? 'day' : 'days'}
                          </span>
                        </div>

                        <div className="overflow-hidden rounded-lg">
                          <table className="w-full text-left text-xs border-collapse font-sans print-table">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                                <th className="p-2.5 font-mono">Date</th>
                                <th className="p-2.5">Weekday</th>
                                <th className="p-2.5 text-center">Week</th>
                                <th className="p-2.5 text-center font-bold">Worked Hours</th>
                                <th className="p-2.5 text-center font-bold">Overtime</th>
                                <th className="p-2.5">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-350 font-semibold">
                              {group.entries.map((e) => (
                                <tr key={e.date} className="break-inside-avoid hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                                  <td className="p-2.5 font-mono whitespace-nowrap text-[#2C3639] dark:text-[#2C3639] font-extrabold text-[11px] print-text-primary col-inkwell">{e.date}</td>
                                  <td className="p-2.5 font-semibold text-[#2C3639] dark:text-slate-300 col-inkwell">{e.weekday}</td>
                                  <td className="p-2.5 text-center font-bold font-mono text-[#2C3639] dark:text-slate-300 text-[10px] col-inkwell">W{e.weekNumber}</td>
                                  <td className="p-2.5 text-center font-bold font-mono text-[#2C3639] dark:text-[#2C3639] text-[11px] print-text-primary col-inkwell">{e.finalCountedHours.toFixed(2)} hrs</td>
                                  <td className="p-2.5 text-center font-bold font-mono">
                                    <span className={e.overtime > 0 ? 'text-[#73825E] dark:text-[#8A9A76] print-overtime-positive col-olive' : e.overtime < 0 ? 'text-rose-605 font-bold print-overtime-negative' : 'text-slate-400'}>
                                      {e.overtime >= 0 ? `+${e.overtime.toFixed(2)}` : e.overtime.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="p-2.5 break-words whitespace-normal text-slate-500 dark:text-slate-400 font-normal italic print-text-neutral" title={e.notes}>
                                    {e.category === WorkCategory.OtherOffice && (
                                      <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-[9px] font-bold px-1.5 py-0.5 rounded mr-1.5 not-italic select-none border border-indigo-100 dark:border-indigo-900/30">
                                        Different Office{e.location ? `: ${e.location}` : ''}
                                      </span>
                                    )}
                                    {e.notes || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    
                    {statementEntries.length === 0 && (
                      <div className="text-center py-8 text-slate-400 dark:text-slate-500 italic font-medium bg-slate-50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800 rounded-xl print-inverted-window">
                        No office or different office commute entries recorded in the selected timeframe.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
    </div>
  );
}
