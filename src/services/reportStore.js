/**
 * Report storage service — localStorage-backed for demo, expandable to Supabase.
 * Each report: { id, timestamp, patientId, patientName, diagnosis, summary, fileName, pdfDataUri, prescriptionId }
 */

const STORAGE_KEY = 'swasthalink_health_reports';

function getAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(reports) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (e) {
    console.warn('Failed to persist reports:', e.message);
  }
}

export function saveReport({ patientId, patientName, diagnosis, summary, fileName, pdfDataUri, prescriptionId }) {
  const reports = getAll();
  const report = {
    id: `RPT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    patientId,
    patientName,
    diagnosis: (diagnosis || '').substring(0, 200),
    summary,
    fileName,
    pdfDataUri,
    prescriptionId,
  };
  reports.unshift(report);
  // Keep max 20 reports to avoid localStorage bloat
  if (reports.length > 20) reports.length = 20;
  persist(reports);
  return report;
}

export function getReports() {
  return getAll();
}

export function getReportById(id) {
  return getAll().find(r => r.id === id) || null;
}

export function deleteReport(id) {
  const reports = getAll().filter(r => r.id !== id);
  persist(reports);
  return reports;
}

export function downloadReportPdf(report) {
  if (!report?.pdfDataUri) return;
  const link = document.createElement('a');
  link.href = report.pdfDataUri;
  link.download = report.fileName || 'SwasthaLink_Report.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
