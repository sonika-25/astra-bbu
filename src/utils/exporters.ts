import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import pptxgen from 'pptxgenjs';
import {
  LAUNCHES, getProduct,
  type Launch, type Task, type BusinessFunction, type Status,
} from '../data/mockData';

export type ExportExt = 'pptx' | 'xlsx' | 'csv' | 'pdf';
export type ExportArtifact =
  | 'Gantt chart' | 'Task table' | 'Milestone timeline'
  | 'Launch calendar' | 'Launch summary' | 'Handoff report' | 'Report';

export interface ExportSpec {
  ext: ExportExt;
  artifact: ExportArtifact;
  fn?: BusinessFunction;
  launch?: Launch;
  name: string;
  desc: string;
}

const STATUS_LABEL: Record<Status, string> = {
  'delayed': 'Delayed', 'at-risk': 'At risk', 'on-track': 'On track',
  'completed': 'Completed', 'not-started': 'Not started', 'not-applicable': 'N/A',
};

const GANTT_COLOR: Record<Status, string> = {
  'delayed': 'C0392B', 'at-risk': 'E67E22', 'on-track': '2E8540',
  'completed': '6B7280', 'not-started': '94A3B8', 'not-applicable': 'CBD5E1',
};

interface TableData { title: string; headers: string[]; rows: string[][]; }
interface GanttRow { name: string; start: string; end: string; status: Status; meta: string; }

/* ------------------------------ Data collection ------------------------------ */

function taskPool(spec: ExportSpec): { task: Task; launch: Launch }[] {
  const scope = spec.launch ? [spec.launch] : LAUNCHES;
  let all = scope.flatMap(l => l.activities.flatMap(a => a.tasks.map(task => ({ task, launch: l }))));
  if (spec.fn) all = all.filter(x => x.task.leadFunction === spec.fn);
  return all;
}

function scopeTitle(spec: ExportSpec): string {
  const parts = [
    spec.fn ? `${spec.fn} tasks` : '',
    spec.launch ? `${getProduct(spec.launch.productId).brand} — ${spec.launch.country}` : 'All launches',
  ].filter(Boolean);
  return `${spec.artifact} · ${parts.join(' · ')}`;
}

function buildTable(spec: ExportSpec): TableData {
  const title = scopeTitle(spec);

  if (spec.artifact === 'Milestone timeline') {
    const scope = spec.launch ? [spec.launch] : LAUNCHES;
    const rows = scope
      .flatMap(l => l.milestones.map(m => ({ m, l })))
      .sort((a, b) => a.m.date.localeCompare(b.m.date))
      .map(({ m, l }) => [m.label, m.date, m.status, getProduct(l.productId).brand, l.country]);
    return { title, headers: ['Milestone', 'Date', 'Status', 'Brand', 'Country'], rows };
  }

  if (spec.artifact === 'Launch calendar') {
    const rows = [...LAUNCHES]
      .sort((a, b) => a.launchDate.localeCompare(b.launchDate))
      .map(l => [l.launchLabel, l.launchDate, getProduct(l.productId).brand, l.country, l.currentPhase, STATUS_LABEL[l.status]]);
    return { title, headers: ['Window', 'Launch date', 'Brand', 'Country', 'Phase', 'Status'], rows };
  }

  if (spec.artifact === 'Launch summary') {
    const scope = spec.launch ? [spec.launch] : LAUNCHES;
    const rows = scope.map(l => [
      getProduct(l.productId).brand, l.country, l.currentPhase, `${l.completion}%`,
      STATUS_LABEL[l.status], l.launchDate, l.launchManager,
    ]);
    return { title, headers: ['Brand', 'Country', 'Phase', 'Readiness', 'Status', 'Launch date', 'Launch manager'], rows };
  }

  if (spec.artifact === 'Handoff report') {
    const rows = taskPool(spec)
      .filter(x => x.task.handoffStatus)
      .map(x => [
        x.task.name, x.task.handoffStatus!, x.task.leadFunction,
        getProduct(x.launch.productId).brand, x.launch.country, x.task.leadOwner ?? 'Unassigned',
      ]);
    return { title, headers: ['Task', 'Handoff status', 'Function', 'Brand', 'Country', 'Owner'], rows };
  }

  // Task table / Gantt chart (tabular formats) / generic Report
  const rows = taskPool(spec).slice(0, 400).map(x => [
    x.task.name, getProduct(x.launch.productId).brand, x.launch.country,
    x.task.leadFunction, STATUS_LABEL[x.task.status], `${x.task.completion}%`,
    x.task.startDate, x.task.endDate, x.task.leadOwner ?? 'Unassigned',
  ]);
  return {
    title,
    headers: ['Task', 'Brand', 'Country', 'Function', 'Status', 'Completion', 'Start', 'End', 'Owner'],
    rows,
  };
}

function buildGanttRows(spec: ExportSpec): GanttRow[] {
  return taskPool(spec)
    .sort((a, b) => a.task.startDate.localeCompare(b.task.startDate))
    .slice(0, 24)
    .map(x => ({
      name: x.task.name,
      start: x.task.startDate,
      end: x.task.endDate,
      status: x.task.status,
      meta: `${getProduct(x.launch.productId).brand} · ${x.launch.country}`,
    }));
}

/* --------------------------------- Builders --------------------------------- */

function csvBlob(t: TableData): Blob {
  const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const text = [t.headers, ...t.rows].map(r => r.map(esc).join(',')).join('\r\n');
  return new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
}

function xlsxBlob(t: TableData): Blob {
  const ws = XLSX.utils.aoa_to_sheet([[t.title], [], t.headers, ...t.rows]);
  ws['!cols'] = t.headers.map((h, i) => ({
    wch: Math.min(48, Math.max(h.length, ...t.rows.map(r => (r[i] ?? '').length)) + 2),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function pdfBlob(t: TableData): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(t.title, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Generated ${new Date().toLocaleString('en-GB')} · LaunchPAL`, 40, 56);
  autoTable(doc, {
    head: [t.headers],
    body: t.rows,
    startY: 72,
    margin: { left: 40, right: 40 },
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [11, 31, 68] },
  });
  return doc.output('blob');
}

async function pptxTableBlob(t: TableData): Promise<Blob> {
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
  pptx.layout = 'WIDE';
  const slide = pptx.addSlide();
  slide.addText(t.title, { x: 0.5, y: 0.3, w: 12.3, h: 0.5, fontSize: 20, bold: true, color: '0B1F44' });
  slide.addTable(
    [
      t.headers.map(h => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: '0B1F44' } } })),
      ...t.rows.slice(0, 60).map(r => r.map(c => ({ text: c }))),
    ],
    { x: 0.5, y: 1.0, w: 12.3, fontSize: 9, border: { pt: 0.5, color: 'D9DEE7' }, autoPage: true, autoPageRepeatHeader: true },
  );
  return await pptx.write({ outputType: 'blob' }) as Blob;
}

async function pptxGanttBlob(spec: ExportSpec): Promise<Blob> {
  const rows = buildGanttRows(spec);
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
  pptx.layout = 'WIDE';

  const perSlide = 12;
  const chunks: GanttRow[][] = [];
  for (let i = 0; i < rows.length; i += perSlide) chunks.push(rows.slice(i, i + perSlide));
  if (chunks.length === 0) chunks.push([]);

  const t0 = Math.min(...rows.map(r => new Date(r.start).getTime()));
  const t1 = Math.max(...rows.map(r => new Date(r.end).getTime()));
  const span = Math.max(t1 - t0, 1);
  const chartX = 4.6, chartW = 8.2;

  chunks.forEach((chunk, ci) => {
    const slide = pptx.addSlide();
    slide.addText(scopeTitle(spec) + (chunks.length > 1 ? ` (${ci + 1}/${chunks.length})` : ''), {
      x: 0.5, y: 0.3, w: 12.3, h: 0.5, fontSize: 20, bold: true, color: '0B1F44',
    });
    // Date axis ends
    slide.addText(new Date(t0).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), {
      x: chartX, y: 0.85, w: 1.4, h: 0.3, fontSize: 9, color: '6B7280',
    });
    slide.addText(new Date(t1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), {
      x: chartX + chartW - 1.4, y: 0.85, w: 1.4, h: 0.3, fontSize: 9, color: '6B7280', align: 'right',
    });

    chunk.forEach((r, i) => {
      const y = 1.3 + i * 0.48;
      const s = (new Date(r.start).getTime() - t0) / span;
      const e = (new Date(r.end).getTime() - t0) / span;
      slide.addText(`${r.name}\n${r.meta}`, {
        x: 0.5, y, w: 4.0, h: 0.44, fontSize: 8.5, color: '1F2937', valign: 'middle', lineSpacing: 10,
      });
      slide.addShape('rect', {
        x: chartX, y: y + 0.1, w: chartW, h: 0.22, fill: { color: 'F1F3F7' }, line: { color: 'E3E7EE', width: 0.5 },
      });
      slide.addShape('roundRect', {
        x: chartX + s * chartW, y: y + 0.1, w: Math.max((e - s) * chartW, 0.08), h: 0.22,
        fill: { color: GANTT_COLOR[r.status] }, line: { width: 0 }, rectRadius: 0.03,
      });
    });

    // Legend
    (['on-track', 'at-risk', 'delayed', 'completed'] as Status[]).forEach((st, i) => {
      slide.addShape('rect', { x: 0.5 + i * 1.7, y: 7.1, w: 0.18, h: 0.18, fill: { color: GANTT_COLOR[st] }, line: { width: 0 } });
      slide.addText(STATUS_LABEL[st], { x: 0.72 + i * 1.7, y: 7.05, w: 1.4, h: 0.28, fontSize: 9, color: '4B5563' });
    });
  });

  return await pptx.write({ outputType: 'blob' }) as Blob;
}

/* --------------------------------- Public API -------------------------------- */

export async function generateExport(spec: ExportSpec): Promise<Blob> {
  if (spec.ext === 'pptx') {
    return spec.artifact === 'Gantt chart' ? pptxGanttBlob(spec) : pptxTableBlob(buildTable(spec));
  }
  const table = buildTable(spec);
  if (spec.ext === 'xlsx') return xlsxBlob(table);
  if (spec.ext === 'pdf') return pdfBlob(table);
  return csvBlob(table);
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
