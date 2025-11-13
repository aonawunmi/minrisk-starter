/**
 * Word Document Export
 * Export report drafts to Microsoft Word (.docx) format
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';
import { ReportDraft } from '../../types/report-types';

/**
 * Export report draft to Word document
 */
export async function exportToWord(draft: ReportDraft): Promise<void> {
  try {
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          headers: {
            default: createHeader(draft),
          },
          footers: {
            default: createFooter(draft),
          },
          children: createDocumentContent(draft),
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const filename = `${draft.audience}_report_${draft.period.replace(/\s/g, '_')}_${draft.status}.docx`;
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error exporting to Word:', error);
    throw new Error('Failed to export to Word document');
  }
}

/**
 * Create document header
 */
function createHeader(draft: ReportDraft): any {
  return {
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `${draft.audience.toUpperCase()} REPORT - ${draft.period}`,
            size: 20,
            bold: true,
          }),
        ],
      }),
    ],
  };
}

/**
 * Create document footer
 */
function createFooter(draft: ReportDraft): any {
  return {
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Generated: ${new Date(draft.created_at).toLocaleDateString()} | Status: ${draft.status.toUpperCase()}`,
            size: 18,
            italics: true,
          }),
        ],
      }),
    ],
  };
}

/**
 * Create main document content
 */
function createDocumentContent(draft: ReportDraft): Paragraph[] {
  const content: Paragraph[] = [];

  // Title Page
  content.push(
    new Paragraph({
      text: `${getAudienceTitle(draft.audience, draft.regulator_type)} Risk Management Report`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  content.push(
    new Paragraph({
      text: `Period: ${draft.period}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Draft Watermark
  if (draft.status === 'draft') {
    content.push(
      new Paragraph({
        text: '*** DRAFT ***',
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: '*** DRAFT - FOR REVIEW ONLY ***',
            bold: true,
            size: 32,
            color: 'CC0000',
          }),
        ],
      })
    );
  }

  content.push(
    new Paragraph({
      text: `Created: ${new Date(draft.created_at).toLocaleDateString()}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  content.push(
    new Paragraph({
      text: `By: ${draft.created_by_email}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  // Page break before content
  content.push(
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    })
  );

  // Add sections
  const includedSections = draft.sections.filter((s) => s.included).sort((a, b) => a.order - b.order);

  for (const section of includedSections) {
    // Section Title
    content.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // Section Narrative
    if (section.narrative) {
      const narrativeParagraphs = section.narrative.split('\n').filter((p) => p.trim());
      for (const para of narrativeParagraphs) {
        content.push(
          new Paragraph({
            text: para,
            spacing: { after: 120 },
          })
        );
      }
    }

    // Section Data (if table)
    if (section.data && section.content_type === 'table') {
      content.push(...createTableFromData(section.data));
    }

    // Spacing after section
    content.push(
      new Paragraph({
        text: '',
        spacing: { after: 400 },
      })
    );
  }

  // Audit Trail (optional appendix)
  if (draft.audit_trail && draft.audit_trail.length > 0) {
    content.push(
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      })
    );

    content.push(
      new Paragraph({
        text: 'Appendix: Edit History',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    for (const edit of draft.audit_trail.slice(0, 10)) {
      content.push(
        new Paragraph({
          text: `${new Date(edit.timestamp).toLocaleString()} - ${edit.user_email} - ${edit.action}`,
          spacing: { after: 80 },
        })
      );
    }
  }

  return content;
}

/**
 * Create table from data object
 */
function createTableFromData(data: any): Paragraph[] {
  const content: Paragraph[] = [];

  // Simple table rendering for arrays of objects
  if (Array.isArray(data)) {
    // Skip if empty
    if (data.length === 0) return content;

    // Get keys from first object
    const keys = Object.keys(data[0]);

    // Note: Full table implementation with docx is complex
    // For now, render as formatted text
    content.push(
      new Paragraph({
        text: '[TABLE DATA]',
        spacing: { before: 200, after: 200 },
      })
    );

    for (const row of data.slice(0, 20)) {
      // Limit to 20 rows
      const rowText = keys.map((k) => `${k}: ${row[k]}`).join(' | ');
      content.push(
        new Paragraph({
          text: rowText,
          spacing: { after: 80 },
        })
      );
    }
  } else if (typeof data === 'object') {
    // Render object as key-value pairs
    for (const [key, value] of Object.entries(data)) {
      content.push(
        new Paragraph({
          text: `${key}: ${JSON.stringify(value)}`,
          spacing: { after: 80 },
        })
      );
    }
  }

  return content;
}

/**
 * Get audience-specific title
 */
function getAudienceTitle(audience: string, regulatorType?: string): string {
  if (audience === 'regulator') {
    if (regulatorType === 'CBN') return 'Central Bank of Nigeria (CBN)';
    if (regulatorType === 'SEC') return 'Securities and Exchange Commission (SEC)';
    if (regulatorType === 'PENCOM') return 'National Pension Commission (PENCOM)';
    return 'Regulatory';
  } else if (audience === 'board') {
    return 'Board Risk Committee (BRC)';
  } else if (audience === 'ceo') {
    return 'CEO/Executive Committee';
  }
  return 'Enterprise';
}
