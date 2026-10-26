// Generate disposable, fictional CV files for browser QA; never use personal CVs.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';

async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'carvio-cv-qa-'));
  const text = 'TEST DATA ONLY - QA Candidate\nInventory Manager\nLed a team of 8 and improved inventory accuracy by 15%.\nSkills: Excel, demand planning, English.';
  await fs.writeFile(path.join(directory, 'qa-cv.txt'), text);
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + text.split('\n').map(line => '<w:p><w:r><w:t>' + line + '</w:t></w:r></w:p>').join('') + '</w:body></w:document>');
  await fs.writeFile(path.join(directory, 'qa-cv.docx'), await zip.generateAsync({type:'nodebuffer'}));
  function pdf(lines) {
    const stream = 'BT /F1 12 Tf 50 750 Td ' + lines.map((line,i) => (i ? '0 -18 Td ' : '') + '(' + line.replace(/[()\\]/g,'\\$&') + ') Tj').join('\n') + ' ET';
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length ' + Buffer.byteLength(stream) + ' >>\nstream\n' + stream + '\nendstream'];
    let result='%PDF-1.4\n'; const offsets=[0];
    objects.forEach((object,i) => { offsets.push(Buffer.byteLength(result)); result+=(i+1)+' 0 obj\n'+object+'\nendobj\n'; });
    const xref=Buffer.byteLength(result);
    result+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
    return result;
  }
  await fs.writeFile(path.join(directory,'qa-cv.pdf'),pdf(text.split('\n')));
  await fs.writeFile(path.join(directory,'qa-empty.pdf'),pdf([]));
  await fs.writeFile(path.join(directory,'qa-corrupt.pdf'),'TEST DATA ONLY - invalid PDF');
  await fs.writeFile(path.join(directory,'qa-legacy.doc'),'TEST DATA ONLY - unsupported legacy Word format');
  await fs.writeFile(path.join(directory,'qa-oversize.txt'),Buffer.alloc(10_000_001,65));
  console.log(JSON.stringify({directory, files:['qa-cv.txt','qa-cv.docx','qa-cv.pdf','qa-empty.pdf','qa-corrupt.pdf','qa-legacy.doc','qa-oversize.txt'].map(name=>path.join(directory,name))}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
