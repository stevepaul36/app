const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const js=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
test('every id the game script looks up at startup exists in index.html',()=>{
  const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
  const created=new Set([...js.matchAll(/\.id\s*=\s*'([^']+)'/g)].map(m=>m[1]));
  const used=new Set([...js.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]));
  const missing=[...used].filter(id=>!ids.has(id)&&!created.has(id));
  assert.deepStrictEqual(missing,[]);
});
