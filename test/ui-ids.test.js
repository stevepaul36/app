const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const js=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
test('every id the game script looks up exists in index.html or a template it renders',()=>{
  const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
  const created=new Set([...js.matchAll(/\.id\s*=\s*'([^']+)'/g),...js.matchAll(/id="([^"$]+)"/g)].map(m=>m[1]));
  const used=new Set([...js.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]));
  const missing=[...used].filter(id=>!ids.has(id)&&!created.has(id));
  assert.deepStrictEqual(missing,[]);
});
