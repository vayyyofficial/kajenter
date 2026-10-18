import jsPDF from 'jspdf';
import { ClassSchedule, PiketSchedule } from '../types';

export function downloadSchedulePdf(schedules: ClassSchedule[], className = 'X ICP TKJ - 35'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 18;

  // Header banner
  doc.setFillColor(220, 38, 38); // Brand Red #dc2626
  doc.rect(14, currentY, pageWidth - 28, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SMK TELKOM MALANG', pageWidth / 2, currentY + 8, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`JADWAL PELAJARAN — ${className.toUpperCase()}`, pageWidth / 2, currentY + 16, { align: 'center' });

  currentY += 30;

  // Group by day of week
  const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const grouped: Record<string, ClassSchedule[]> = {};

  daysOrder.forEach((day) => {
    grouped[day] = schedules
      .filter((s) => s.day_of_week.toLowerCase() === day.toLowerCase())
      .sort((a, b) => a.order_index - b.order_index);
  });

  daysOrder.forEach((day) => {
    const items = grouped[day] || [];
    if (items.length === 0) return;

    // Check page height
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    // Day Header
    doc.setFillColor(243, 244, 246);
    doc.rect(14, currentY, pageWidth - 28, 7, 'F');
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(day.toUpperCase(), 18, currentY + 5.2);
    currentY += 9;

    // Table Header (Requirement #14: TIDAK PERLU Ruangan)
    doc.setFillColor(250, 250, 250);
    doc.rect(14, currentY, pageWidth - 28, 6, 'F');
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('WAKTU', 18, currentY + 4.2);
    doc.text('MATA PELAJARAN', 65, currentY + 4.2);
    doc.text('GURU PENGAMPU', 140, currentY + 4.2);
    currentY += 7;

    // Items
    items.forEach((item, idx) => {
      if (currentY > 275) {
        doc.addPage();
        currentY = 20;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(249, 250, 251);
        doc.rect(14, currentY, pageWidth - 28, 6.5, 'F');
      }

      doc.setTextColor(17, 24, 39);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');

      const timeText = `${item.start_time || (item as any).startTime} - ${item.end_time || (item as any).endTime}`;
      doc.text(timeText, 18, currentY + 4.5);
      doc.text(item.subject, 65, currentY + 4.5);
      doc.text(item.teacher_name || (item as any).teacherName || '-', 140, currentY + 4.5);

      currentY += 6.5;
    });

    currentY += 4;
  });

  // Footer note
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(7.5);
  doc.text(`Dicetak dari Portal Resmi ${className} pada ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`, 14, 288);

  doc.save(`Jadwal_Pelajaran_${className.replace(/\s+/g, '_')}.pdf`);
}

export function downloadPiketPdf(piketList: PiketSchedule[], className = 'X ICP TKJ - 35'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 18;

  // Header banner
  doc.setFillColor(220, 38, 38);
  doc.rect(14, currentY, pageWidth - 28, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SMK TELKOM MALANG', pageWidth / 2, currentY + 8, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`JADWAL PIKET KEBERSIHAN KELAS — ${className.toUpperCase()}`, pageWidth / 2, currentY + 16, { align: 'center' });

  currentY += 30;

  const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const grouped: Record<string, PiketSchedule[]> = {};

  daysOrder.forEach((day) => {
    grouped[day] = piketList
      .filter((p) => (p.day_of_week || (p as any).day || '').toLowerCase() === day.toLowerCase())
      .sort((a, b) => a.order_index - b.order_index);
  });

  daysOrder.forEach((day) => {
    const items = grouped[day] || [];
    if (items.length === 0) return;

    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(243, 244, 246);
    doc.rect(14, currentY, pageWidth - 28, 7, 'F');
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(day.toUpperCase(), 18, currentY + 5.2);
    currentY += 9;

    // Table Header (Requirement #16: TIDAK PERLU Tugas Piket, cukup struktur sederhana)
    doc.setFillColor(250, 250, 250);
    doc.rect(14, currentY, pageWidth - 28, 6, 'F');
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('NO', 18, currentY + 4.2);
    doc.text('NAMA ANGGOTA PIKET KELAS', 45, currentY + 4.2);
    currentY += 7;

    items.forEach((item, idx) => {
      if (currentY > 275) {
        doc.addPage();
        currentY = 20;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(249, 250, 251);
        doc.rect(14, currentY, pageWidth - 28, 6.5, 'F');
      }

      doc.setTextColor(17, 24, 39);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');

      doc.text(String(idx + 1), 18, currentY + 4.5);
      doc.text(item.member_name || (item as any).memberName || '-', 45, currentY + 4.5);

      currentY += 6.5;
    });

    currentY += 4;
  });

  doc.setTextColor(156, 163, 175);
  doc.setFontSize(7.5);
  doc.text(`Dicetak dari Portal Resmi ${className} pada ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`, 14, 288);

  doc.save(`Jadwal_Piket_${className.replace(/\s+/g, '_')}.pdf`);
}
