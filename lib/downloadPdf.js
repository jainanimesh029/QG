import { pdfFileName } from './format';

/**
 * Generates the quotation PDF in the browser and triggers a download.
 * @react-pdf/renderer is loaded on demand so it never bloats the initial page load.
 */
export async function downloadQuotationPdf(quotation) {
  const [{ pdf }, { default: QuotationPdf, registerPdfFonts }, React] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../components/pdf/QuotationPdf'),
    import('react'),
  ]);

  registerPdfFonts(window.location.origin);
  const blob = await pdf(React.createElement(QuotationPdf, { quotation })).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = pdfFileName(quotation);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
