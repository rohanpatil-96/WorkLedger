import pdfMake from 'pdfmake/build/pdfmake.js';
import pdfFonts from 'pdfmake/build/vfs_fonts.js';

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs || {};

const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const docDefinition = {
  content: [
    { text: 'Testing image' },
    { image: logoBase64, width: 16, height: 16 }
  ]
};

try {
  pdfMake.createPdf(docDefinition);
  console.log('Success creating PDF');
} catch (e) {
  console.error('Error creating PDF:', e);
}
