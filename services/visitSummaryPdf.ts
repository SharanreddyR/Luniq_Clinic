import * as Print from 'expo-print';

export type VisitSummaryPdfInput = {
  slipId: string;
  clinicName: string;
  patientName: string;
  patientCard: string;
  department: string;
  doctorName: string;
  services: string[];
  amount: string;
  symptoms: string;
  generatedAtLabel: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(i: VisitSummaryPdfInput): string {
  const rows = [
    ['Visit ref', escapeHtml(i.slipId)],
    ['Clinic', escapeHtml(i.clinicName)],
    ['Patient', escapeHtml(i.patientName)],
    ['Card', escapeHtml(i.patientCard)],
    ['Department', escapeHtml(i.department)],
    ['Doctor', escapeHtml(i.doctorName)],
    ['Services', escapeHtml(i.services.join(', '))],
    ['Amount (₹)', escapeHtml(i.amount)],
    ['Chief complaint', escapeHtml(i.symptoms)],
    ['Generated', escapeHtml(i.generatedAtLabel)],
  ]
    .map(
      ([k, v]) =>
        `<tr><th style="text-align:left;padding:8px 12px;border:1px solid #c5dedb;background:#e8f4f4;width:32%;">${k}</th><td style="padding:8px 12px;border:1px solid #c5dedb;">${v}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#062d2f; padding:24px; }
    h1 { font-size:20px; color:#2ebdb4; margin:0 0 16px; }
    table { border-collapse:collapse; width:100%; font-size:14px; }
  </style></head><body>
    <h1>Visit summary — claims &amp; admin approval</h1>
    <p style="margin:0 0 16px;font-size:13px;color:#4a6b6d;">Submit this pack for insurance / admin review. Background verification typically 10–15 minutes after lead approval.</p>
    <table>${rows}</table>
  </body></html>`;
}

export async function printVisitSummaryPdf(
  input: VisitSummaryPdfInput,
): Promise<{ uri: string }> {
  const html = buildHtml(input);
  const { uri } = await Print.printToFileAsync({ html });
  return { uri };
}
