const fs = require('fs');

const buf = fs.readFileSync('test_img.png');

// Check PNG signature
if (buf.readUInt32BE(0) !== 0x89504E47 || buf.readUInt32BE(4) !== 0x0D0A1A0A) {
  console.error('Not a valid PNG');
  process.exit(1);
}

const outChunks = [];
let pos = 8;

while (pos < buf.length) {
  if (pos + 8 > buf.length) break;
  const length = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  
  if (pos + 12 + length > buf.length) {
    console.error('Chunk goes out of bounds:', type, length);
    break;
  }
  
  const chunkData = buf.slice(pos, pos + 12 + length);
  
  console.log('Found chunk:', type, 'length:', length);
  
  // Keep only essential chunks
  if (type === 'IHDR' || type === 'IDAT' || type === 'IEND' || type === 'PLTE') {
    outChunks.push(chunkData);
  } else {
    console.log('Stripping chunk:', type);
  }
  
  pos += 12 + length;
}

const cleanPng = Buffer.concat([buf.slice(0, 8), ...outChunks]);
fs.writeFileSync('clean_img.png', cleanPng);
console.log('Wrote clean PNG, base64 length:', cleanPng.toString('base64').length);
console.log('Base64:', 'data:image/png;base64,' + cleanPng.toString('base64'));
