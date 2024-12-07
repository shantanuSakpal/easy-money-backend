const { PDFDocument } = require('pdf-lib');
const { htmlToPdf } = require('./htmlToPdf');

async function generatePDF(htmlContent) {
  try {
    // Convert HTML to PDF
    const pdfBuffer = await htmlToPdf(htmlContent);
    return pdfBuffer;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
}

module.exports = { generatePDF };