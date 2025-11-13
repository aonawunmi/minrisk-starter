/**
 * PDF Export
 * Export report drafts to PDF format with watermarks
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportDraft } from '../../types/report-types';

/**
 * Export report draft to PDF
 */
export function exportToPDF(draft: ReportDraft): void {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let yPosition = 20;

    // Add DRAFT watermark if needed
    if (draft.status === 'draft') {
      addDraftWatermark(doc);
    }

    // Title Page
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(getAudienceTitle(draft.audience, draft.regulator_type), 105, yPosition, {
      align: 'center',
    });
    yPosition += 10;

    doc.setFontSize(16);
    doc.text('Risk Management Report', 105, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${draft.period}`, 105, yPosition, { align: 'center' });
    yPosition += 10;

    doc.text(`Status: ${draft.status.toUpperCase()}`, 105, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Created: ${new Date(draft.created_at).toLocaleDateString()}`, 105, yPosition, {
      align: 'center',
    });
    yPosition += 6;

    doc.text(`By: ${draft.created_by_email}`, 105, yPosition, { align: 'center' });

    // Add sections
    const includedSections = draft.sections.filter((s) => s.included).sort((a, b) => a.order - b.order);

    for (const section of includedSections) {
      doc.addPage();
      yPosition = 20;

      // Re-add watermark on each page if draft
      if (draft.status === 'draft') {
        addDraftWatermark(doc);
      }

      // Section Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, 20, yPosition);
      yPosition += 10;

      // Section Narrative
      if (section.narrative) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        const narrativeLines = doc.splitTextToSize(section.narrative, 170);
        doc.text(narrativeLines, 20, yPosition);
        yPosition += narrativeLines.length * 6;
      }

      // Section Data (if table)
      if (section.data && section.content_type === 'table') {
        yPosition += 10;
        addTableData(doc, section.data, yPosition);
      }
    }

    // Add footer to all pages
    addFooters(doc, draft);

    // Save
    const filename = `${draft.audience}_report_${draft.period.replace(/\s/g, '_')}_${draft.status}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export to PDF');
  }
}

/**
 * Add DRAFT watermark diagonally across the page
 */
function addDraftWatermark(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Save current state
  const currentColor = doc.getTextColor();

  // Set watermark style (light red/gray)
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(60);
  doc.setFont('helvetica', 'bold');

  // Add rotated DRAFT text
  doc.text('DRAFT', pageWidth / 2, pageHeight / 2, {
    angle: 45,
    align: 'center',
  });

  // Restore original color
  doc.setTextColor(currentColor);
}

/**
 * Add footers to all pages
 */
function addFooters(doc: jsPDF, draft: ReportDraft): void {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Page ${i} of ${pageCount} | Generated: ${new Date().toLocaleDateString()}`,
      105,
      285,
      { align: 'center' }
    );
  }
}

/**
 * Add table data using autoTable
 */
function addTableData(doc: jsPDF, data: any, startY: number): void {
  if (Array.isArray(data) && data.length > 0) {
    // Get columns from first object
    const columns = Object.keys(data[0]).map((key) => ({
      header: key.replace(/_/g, ' ').toUpperCase(),
      dataKey: key,
    }));

    autoTable(doc, {
      startY,
      head: [columns.map((c) => c.header)],
      body: data.slice(0, 50).map((row) => columns.map((c) => row[c.dataKey])), // Limit to 50 rows
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [66, 66, 66], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 20, right: 20 },
    });
  } else if (typeof data === 'object') {
    // Render object as key-value table
    const tableData = Object.entries(data).map(([key, value]) => [
      key.replace(/_/g, ' ').toUpperCase(),
      String(value),
    ]);

    autoTable(doc, {
      startY,
      body: tableData,
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 20, right: 20 },
    });
  }
}

/**
 * Get audience-specific title
 */
function getAudienceTitle(audience: string, regulatorType?: string): string {
  if (audience === 'regulator') {
    if (regulatorType === 'CBN') return 'Central Bank of Nigeria (CBN)';
    if (regulatorType === 'SEC') return 'Securities and Exchange Commission (SEC)';
    if (regulatorType === 'PENCOM') return 'National Pension Commission (PENCOM)';
    return 'Regulatory Report';
  } else if (audience === 'board') {
    return 'Board Risk Committee (BRC)';
  } else if (audience === 'ceo') {
    return 'CEO/Executive Committee';
  }
  return 'Enterprise Risk Report';
}
