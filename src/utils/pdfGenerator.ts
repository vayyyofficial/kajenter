import jsPDF from 'jspdf';
import { ClassSchedule, PiketSchedule } from '../types';

interface PDFPalette {
  primary: [number, number, number];
  primaryDark: [number, number, number];
  slateDark: [number, number, number];
  slateText: [number, number, number];
  mutedText: [number, number, number];
  border: [number, number, number];
  zebraBg: [number, number, number];
  headerBg: [number, number, number];
  cardBg: [number, number, number];
}

const PALETTE: PDFPalette = {
  primary: [220, 38, 38], // #dc2626 Brand Crimson
  primaryDark: [185, 28, 28], // #b91c1c
  slateDark: [15, 23, 42], // #0f172a
  slateText: [30, 41, 59], // #1e293b
  mutedText: [100, 116, 139], // #64748b
  border: [226, 232, 240], // #e2e8f0
  zebraBg: [248, 250, 252], // #f8fafc
  headerBg: [241, 245, 249], // #f1f5f9
  cardBg: [255, 255, 255],
};

function formatCurrentWIB(): string {
  const now = new Date();
  return now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Draws a professional branded document header on the current PDF page
 */
function drawDocumentHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  className = 'X ICP TKJ - 35',
  pageWidth: number
): number {
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let currentY = 12;

  // Top accent bar
  doc.setFillColor(...PALETTE.primary);
  doc.rect(marginX, currentY, contentWidth, 3.5, 'F');
  currentY += 8;

  // Class Identity Pill
  doc.setFillColor(254, 242, 242); // #fef2f2 red-50
  doc.setDrawColor(...PALETTE.primary);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, 38, 6.5, 1.5, 1.5, 'FD');

  doc.setTextColor(...PALETTE.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(className, marginX + 19, currentY + 4.5, { align: 'center' });

  // School name top right
  doc.setTextColor(...PALETTE.slateDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SMK TELKOM MALANG', pageWidth - marginX, currentY + 4.5, { align: 'right' });

  currentY += 11;

  // Document Title
  doc.setTextColor(...PALETTE.slateDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title.toUpperCase(), marginX, currentY + 4);

  currentY += 8;

  // Subtitle / metadata
  doc.setTextColor(...PALETTE.mutedText);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${subtitle} • Dicetak pada: ${formatCurrentWIB()}`, marginX, currentY + 2);

  currentY += 5;

  // Thin separator line
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.4);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  return currentY + 6;
}

/**
 * Adds page footer with page number
 */
function drawPageFooter(doc: jsPDF, pageWidth: number, pageHeight: number, pageNum: number, totalPages: number, className: string) {
  const marginX = 14;
  const footerY = pageHeight - 10;

  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.line(marginX, footerY - 3, pageWidth - marginX, footerY - 3);

  doc.setTextColor(...PALETTE.mutedText);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Dokumen Resmi ${className} • SMK Telkom Malang`, marginX, footerY + 1);
  doc.text(`Halaman ${pageNum} dari ${totalPages}`, pageWidth - marginX, footerY + 1, { align: 'right' });
}

/**
 * Download PDF Jadwal Pelajaran (Requirement #7)
 * Columns: Hari | Jam | Mata Pelajaran | Guru (NO Ruangan)
 */
export function downloadSchedulePdf(schedules: ClassSchedule[], className = 'X ICP TKJ - 35'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  let currentY = drawDocumentHeader(
    doc,
    'Jadwal Pelajaran',
    'Tahun Ajaran 2026/2027',
    className,
    pageWidth
  );

  const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const grouped: Record<string, ClassSchedule[]> = {};

  daysOrder.forEach((day) => {
    grouped[day] = schedules
      .filter((s) => (s.day_of_week || (s as any).day || '').toLowerCase() === day.toLowerCase())
      .sort((a, b) => a.order_index - b.order_index);
  });

  // Table Column Widths: Total 182mm (14 + 182 + 14 = 210mm A4)
  const colHariW = 26;
  const colJamW = 32;
  const colMapelW = 66;
  const colGuruW = 58;

  const colHariX = marginX;
  const colJamX = colHariX + colHariW;
  const colMapelX = colJamX + colJamW;
  const colGuruX = colMapelX + colMapelW;

  const drawTableHeader = (y: number): number => {
    const hHeight = 8;
    doc.setFillColor(...PALETTE.slateDark);
    doc.rect(marginX, y, 182, hHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);

    doc.text('HARI', colHariX + 4, y + 5.2);
    doc.text('JAM', colJamX + 4, y + 5.2);
    doc.text('MATA PELAJARAN', colMapelX + 4, y + 5.2);
    doc.text('GURU PENGAMPU', colGuruX + 4, y + 5.2);

    return y + hHeight;
  };

  currentY = drawTableHeader(currentY);

  let globalRowIdx = 0;

  daysOrder.forEach((day) => {
    const items = grouped[day] || [];
    if (items.length === 0) return;

    items.forEach((item, itemIdx) => {
      // Calculate row height based on text wrapping
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      const subjectLines = doc.splitTextToSize(item.subject || '-', colMapelW - 6);
      const teacherName = item.teacher_name || (item as any).teacherName || '-';
      const teacherLines = doc.splitTextToSize(teacherName, colGuruW - 6);

      const maxLines = Math.max(subjectLines.length, teacherLines.length, 1);
      const rowHeight = Math.max(8, maxLines * 4.2 + 4);

      // Check page break
      if (currentY + rowHeight > pageHeight - 18) {
        doc.addPage();
        currentY = drawDocumentHeader(
          doc,
          'Jadwal Pelajaran',
          'Tahun Ajaran 2026/2027 (Lanjutan)',
          className,
          pageWidth
        );
        currentY = drawTableHeader(currentY);
      }

      // Zebra background
      if (globalRowIdx % 2 === 1) {
        doc.setFillColor(...PALETTE.zebraBg);
        doc.rect(marginX, currentY, 182, rowHeight, 'F');
      }

      // Outer row border
      doc.setDrawColor(...PALETTE.border);
      doc.setLineWidth(0.2);
      doc.rect(marginX, currentY, 182, rowHeight, 'S');

      // Internal column dividers
      doc.line(colJamX, currentY, colJamX, currentY + rowHeight);
      doc.line(colMapelX, currentY, colMapelX, currentY + rowHeight);
      doc.line(colGuruX, currentY, colGuruX, currentY + rowHeight);

      // Day Column (Show on first item of each day with bold accent)
      if (itemIdx === 0) {
        doc.setTextColor(...PALETTE.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(day, colHariX + 4, currentY + 5.2);
      } else {
        doc.setTextColor(...PALETTE.mutedText);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`↳ ${day}`, colHariX + 4, currentY + 5.2);
      }

      // Time Column
      doc.setTextColor(...PALETTE.slateDark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      const startTime = item.start_time || (item as any).startTime || '07:00';
      const endTime = item.end_time || (item as any).endTime || '08:30';
      doc.text(`${startTime} – ${endTime}`, colJamX + 4, currentY + 5.2);

      // Subject Column
      doc.setTextColor(...PALETTE.slateText);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(subjectLines, colMapelX + 4, currentY + 5.2);

      // Teacher Column
      doc.setTextColor(...PALETTE.mutedText);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.text(teacherLines, colGuruX + 4, currentY + 5.2);

      currentY += rowHeight;
      globalRowIdx++;
    });

    // Subtle gap between days
    currentY += 2;
  });

  // Stamp page footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter(doc, pageWidth, pageHeight, i, totalPages, className);
  }

  doc.save(`Jadwal_Pelajaran_${className.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Download PDF Jadwal Piket (Requirement #8)
 * Format:
 * Hari | Nama Anggota
 * Senin | Ahmad, Alya, ...
 */
export function downloadPiketPdf(piketList: PiketSchedule[], className = 'X ICP TKJ - 35'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  let currentY = drawDocumentHeader(
    doc,
    'Jadwal Piket',
    'Jadwal Piket Kebersihan Kelas',
    className,
    pageWidth
  );

  const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const grouped: Record<string, string[]> = {};

  daysOrder.forEach((day) => {
    const dayItems = piketList
      .filter((p) => (p.day_of_week || (p as any).day || '').toLowerCase() === day.toLowerCase())
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    grouped[day] = dayItems.map((item) => item.member_name || (item as any).memberName || '').filter(Boolean);
  });

  // Table Columns: Hari (42mm) | Nama Anggota (140mm) = 182mm total
  const colHariW = 42;
  const colAnggotaW = 140;

  const colHariX = marginX;
  const colAnggotaX = colHariX + colHariW;

  const drawTableHeader = (y: number): number => {
    const hHeight = 8;
    doc.setFillColor(...PALETTE.slateDark);
    doc.rect(marginX, y, 182, hHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);

    doc.text('HARI', colHariX + 5, y + 5.2);
    doc.text('NAMA ANGGOTA PIKET KELAS', colAnggotaX + 5, y + 5.2);

    return y + hHeight;
  };

  currentY = drawTableHeader(currentY);

  daysOrder.forEach((day, idx) => {
    const members = grouped[day] || [];
    const membersText = members.length > 0 ? members.join(', ') : 'Belum ditentukan';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const wrappedLines = doc.splitTextToSize(membersText, colAnggotaW - 10);
    const rowHeight = Math.max(12, wrappedLines.length * 4.6 + 6);

    // Page overflow check
    if (currentY + rowHeight > pageHeight - 18) {
      doc.addPage();
      currentY = drawDocumentHeader(
        doc,
        'Jadwal Piket',
        'Jadwal Piket Kebersihan Kelas (Lanjutan)',
        className,
        pageWidth
      );
      currentY = drawTableHeader(currentY);
    }

    // Zebra row background
    if (idx % 2 === 1) {
      doc.setFillColor(...PALETTE.zebraBg);
      doc.rect(marginX, currentY, 182, rowHeight, 'F');
    }

    // Outer row box
    doc.setDrawColor(...PALETTE.border);
    doc.setLineWidth(0.2);
    doc.rect(marginX, currentY, 182, rowHeight, 'S');

    // Divider between columns
    doc.line(colAnggotaX, currentY, colAnggotaX, currentY + rowHeight);

    // Day Cell (Left)
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(colHariX + 4, currentY + 3, 30, 6, 1.2, 1.2, 'F');

    doc.setTextColor(...PALETTE.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(day, colHariX + 19, currentY + 7.2, { align: 'center' });

    // Members count badge
    doc.setTextColor(...PALETTE.mutedText);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text(`${members.length} Anggota`, colHariX + 19, currentY + 11.8, { align: 'center' });

    // Members List (Right)
    doc.setTextColor(...PALETTE.slateDark);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(wrappedLines, colAnggotaX + 5, currentY + 5.8);

    currentY += rowHeight;
  });

  // Stamp page footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter(doc, pageWidth, pageHeight, i, totalPages, className);
  }

  doc.save(`Jadwal_Piket_${className.replace(/\s+/g, '_')}.pdf`);
}
