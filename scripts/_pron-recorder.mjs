#!/usr/bin/env node
/* _pron-recorder.mjs - one-shot human corpus recorder for CR-90
 * calibration. Serves a Vietnamese recorder page on :5299; every saved
 * clip lands as _pron_eval/human/{word}_{bucket}.webm so the eval
 * script can grade it. Run: node scripts/_pron-recorder.mjs */
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '_pron_eval', 'human');
mkdirSync(OUT, { recursive: true });

/* 12 corpus words x good_adult, 10 x accent_vi (hard sounds for Vi
   speakers), 8 x wrong_word (suggested plausible mishearing). */
const CLIPS = [
  ...['bed', 'cat', 'dog', 'egg', 'elephant', 'fish', 'pen', 'pig', 'rice', 'school', 'ship', 'three']
    .map((w) => ({ word: w, bucket: 'good_adult', hint: `Đọc đúng: "${w}"` })),
  ...[
    ['three', 'tri'], ['school', 'sờ-cun'], ['ship', 'síp'], ['fish', 'phít'],
    ['elephant', 'e-le-phần'], ['rice', 'rai-sờ'], ['pen', 'phen'], ['cat', 'két'],
    ['bed', 'bet'], ['dog', 'đót'],
  ].map(([w, hint]) => ({ word: w, bucket: 'accent_vi', hint: `Đọc "${w}" theo kiểu giọng Việt: "${hint}"` })),
  ...[
    ['ship', 'sheep'], ['three', 'tree'], ['bed', 'bad'], ['pen', 'pan'],
    ['cat', 'cut'], ['pig', 'big'], ['fish', 'dish'], ['rice', 'lice'],
  ].map(([w, wrong]) => ({ word: w, bucket: 'wrong_word', hint: `Target "${w}" nhưng CỐ TÌNH đọc: "${wrong}"` })),
];

const page = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ghi âm corpus</title>
<style>
body{font-family:system-ui;margin:0;background:#0b1224;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:24px}
h1{font-size:20px}#bar{width:100%;max-width:560px;background:#1e293b;border-radius:99px;height:10px;margin:12px 0}
#fill{height:100%;border-radius:99px;background:#fbbf24;width:0;transition:width .3s}
#clip{background:#162c55;border-radius:20px;padding:28px;max-width:560px;width:100%;text-align:center}
#hint{font-size:26px;font-weight:800;color:#fde68a;margin:8px 0}
#sub{color:#94a3b8;font-size:14px}
button{border:0;border-radius:14px;font-weight:800;font-size:18px;padding:14px 26px;cursor:pointer;margin:8px 4px}
#rec{background:#f59e0b;color:#451a03}#rec.on{background:#ef4444;color:#fff;animation:blink 1s infinite}
@keyframes blink{50%{opacity:.6}}
#redo{background:#334155;color:#e2e8f0}#skip{background:#334155;color:#94a3b8}
#st{margin-top:10px;color:#7dd3fc;min-height:22px}
audio{width:100%;margin-top:10px}
</style></head><body>
<h1>Ghi âm corpus - <span id="n"></span>/<span id="t"></span> clip</h1>
<div id="bar"><div id="fill"></div></div>
<div id="clip"><div id="sub">Clip <span id="cur"></span></div><div id="hint"></div>
<button id="rec">● Ghi</button><button id="redo" hidden>↺ Ghi lại</button><button id="skip">Bỏ qua →</button>
<audio id="play" controls hidden></audio><div id="st"></div></div>
<script>
let clips=[], i=0, rec, stream, chunks=[];
async function load(){ clips=await (await fetch('/clips')).json();
 const saved=await (await fetch('/saved')).json();
 i=clips.findIndex(c=>!saved.includes(c.word+'_'+c.bucket)); if(i<0)i=clips.length; render(); }
function render(){
 document.getElementById('t').textContent=clips.length;
 document.getElementById('n').textContent=Math.min(i+1,clips.length);
 document.getElementById('fill').style.width=(i/clips.length*100)+'%';
 if(i>=clips.length){document.getElementById('hint').textContent='XONG HẾT - cảm ơn!';document.getElementById('rec').hidden=true;document.getElementById('skip').hidden=true;return;}
 const c=clips[i];document.getElementById('cur').textContent=i+1;
 document.getElementById('hint').textContent=c.hint;
 document.getElementById('play').hidden=true;document.getElementById('redo').hidden=true;
 document.getElementById('st').textContent='';document.getElementById('rec').hidden=false;
}
document.getElementById('skip').onclick=()=>{i++;render();};
document.getElementById('redo').onclick=()=>{render();};
document.getElementById('rec').onclick=async()=>{
 const b=document.getElementById('rec');
 if(rec&&rec.state==='recording'){rec.stop();return;}
 if(!stream)stream=await navigator.mediaDevices.getUserMedia({audio:true});
 chunks=[];rec=new MediaRecorder(stream,{mimeType:'audio/webm'});
 rec.ondataavailable=e=>chunks.push(e.data);
 rec.onstop=async()=>{b.classList.remove('on');b.textContent='● Ghi';
  const blob=new Blob(chunks,{type:'audio/webm'});
  const url=URL.createObjectURL(blob);const a=document.getElementById('play');
  a.src=url;a.hidden=false;document.getElementById('redo').hidden=false;
  const c=clips[i];const buf=await blob.arrayBuffer();
  let bin='';new Uint8Array(buf).forEach(x=>bin+=String.fromCharCode(x));
  document.getElementById('st').textContent='Đang lưu '+c.word+'_'+c.bucket+'...';
  const r=await fetch('/save',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({name:c.word+'_'+c.bucket+'.webm',data:btoa(bin)})});
  document.getElementById('st').textContent=r.ok?'Đã lưu ✓':'LỖI lưu!';
  if(r.ok){setTimeout(()=>{i++;render();},900);}};
 rec.start();b.classList.add('on');b.textContent='■ Dừng';};
load();
</script></body></html>`;

createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page);
  } else if (req.method === 'GET' && req.url === '/clips') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(CLIPS));
  } else if (req.method === 'GET' && req.url === '/saved') {
    const names = existsSync(OUT) ? readdirSync(OUT).map((f) => f.replace(/\.webm$/, '')) : [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(names));
  } else if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { name, data } = JSON.parse(body);
        if (!/^[a-z]+_(good_adult|accent_vi|wrong_word)\.webm$/.test(name)) throw new Error('bad name');
        writeFileSync(join(OUT, name), Buffer.from(data, 'base64'));
        console.log('saved', name);
        res.writeHead(200).end('ok');
      } catch (e) {
        res.writeHead(400).end(String(e.message));
      }
    });
  } else {
    res.writeHead(404).end();
  }
}).listen(5299, () => console.log('recorder: http://localhost:5299  (ctrl+C khi xong)'));
