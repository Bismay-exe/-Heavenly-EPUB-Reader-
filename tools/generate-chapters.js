// Node.js generator
const fs=require('fs');const path=require('path');
function extractTitle(text,fallback){const m=text.match(/<title>([\s\S]*?)<\/title>/i);return (m?m[1].trim():null)||fallback;}
const dir=process.argv[2]; if(!dir){console.error("Usage: node tools/generate-chapters.js <book_folder>");process.exit(1);}
const abs=path.resolve(dir);
const files=fs.readdirSync(abs).filter(f=>f.toLowerCase().endsWith('.xhtml')).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
const chapters=files.map(f=>{const txt=fs.readFileSync(path.join(abs,f),'utf8');return {file:f,title:extractTitle(txt, path.parse(f).name)};});
fs.writeFileSync(path.join(abs,'chapters.json'), JSON.stringify({chapters}, null, 2));
console.log(`Wrote ${chapters.length} chapters to ${path.join(abs,'chapters.json')}`);
