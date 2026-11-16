// Konfigurasi publik Supabase; kunci Groq hanya digunakan di backend.
const CFG = (typeof CONFIG !== 'undefined') ? CONFIG : {};

const $ = id => document.getElementById(id);
let sb = null, log = [], demo = false, csvText = "", imgB64 = null, demoId = 4780;

try { if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY) sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); } catch (e) { sb = null; }

const fmt = iso => new Date(iso).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });
function flash(el){ el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

function setStatus(kind){
  const s = $('st');
  s.className = 'pill' + (kind === 'demo' ? ' demo' : kind === 'err' ? ' err' : '');
  s.lastElementChild.textContent = kind === 'demo' ? 'Mode demo' : kind === 'err' ? 'Koneksi error' : 'Terhubung';
}

function updateCards(d){
  [['vSuhu','suhu'],['vHum','kelembapan_udara'],['vTanah','rata_rata_tanah'],['vTds','tds'],['vJarak','jarak_air'],['vPh','ph']].forEach(([id,k]) => {
    const el = $(id); let v = d[k] ?? '--';
    if (k === 'ph' && d[k] != null) v = Number(d[k]).toFixed(2);
    if (el.textContent !== String(v)) { el.textContent = v; flash(el); }
  });
}

function addRow(d, prepend = true){
  const tr = document.createElement('tr');
  const bad = d.ph < 6 || d.ph > 8;
  tr.innerHTML = `<td>${fmt(d.created_at)}</td><td>${d.suhu ?? '--'}</td><td>${d.kelembapan_udara ?? '--'}</td><td>${d.rata_rata_tanah ?? '--'}</td><td>${d.tds ?? '--'}</td><td>${d.jarak_air ?? '--'}</td><td class="${bad ? 'warn' : ''}">${d.ph != null ? Number(d.ph).toFixed(2) : '--'}</td>`;
  const tb = $('tb');
  prepend ? tb.prepend(tr) : tb.appendChild(tr);
  while (tb.children.length > 30) tb.removeChild(tb.lastChild);
  $('emp').style.display = 'none';
}

function pushData(d){ log.push(d); updateCards(d); addRow(d, true); }

// ---- Mode demo: data simulasi bila Supabase belum diisi / tidak bisa dijangkau ----
function fakeReading(){
  const r = (a, b) => +(a + Math.random() * (b - a)).toFixed(1);
  return { id: ++demoId, created_at: new Date().toISOString(), suhu: r(26, 31), kelembapan_udara: Math.round(r(62, 85)),
    rata_rata_tanah: Math.round(r(48, 70)), tds: Math.round(r(650, 1200)), jarak_air: r(8, 22), ph: r(5.6, 8.3) };
}
function startDemo(){
  if (demo) return; demo = true; setStatus('demo');
  for (let i = 0; i < 8; i++) { const d = fakeReading(); d.created_at = new Date(Date.now() - (8 - i) * 6000).toISOString(); pushData(d); }
  setInterval(() => pushData(fakeReading()), 6000);
}

async function loadInitial(){
  if (!sb) return startDemo();
  const { data, error } = await sb.from('sensor_data').select('*').order('created_at', { ascending: false }).limit(30);
  if (error || !data) { setStatus('err'); return startDemo(); }
  if (data.length) { log = [...data].reverse(); updateCards(data[0]); data.forEach(r => addRow(r, false)); }
  sb.channel('realtime_sensor_data').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_data' }, p => pushData(p.new)).subscribe();
}

$('csv').onclick = () => {
  if (!log.length) return alert('Belum ada data.');
  let c = 'ID,Waktu Server,Suhu (C),Kelembapan Udara (%),Rata-rata Tanah (%),TDS (PPM),Jarak Air (cm),Nilai pH\n';
  log.forEach(r => c += `${r.id},"${fmt(r.created_at)}",${r.suhu},${r.kelembapan_udara},${r.rata_rata_tanah},${r.tds},${r.jarak_air},${r.ph}\n`);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([c], { type: 'text/csv;charset=utf-8' }));
  a.download = `CitruSense_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
};

// ---- Navigasi ----
function go(p){
  $('pDash').classList.toggle('on', p === 'dash'); $('pChat').classList.toggle('on', p === 'chat');
  $('nDash').classList.toggle('on', p === 'dash'); $('nChat').classList.toggle('on', p === 'chat');
  if (p === 'chat') setTimeout(() => $('inp').focus(), 100);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$('nDash').onclick = () => go('dash'); $('nChat').onclick = () => go('chat'); $('askBtn').onclick = () => go('chat');

// ---- Chat ----
function addMsg(html, user = false, raw = false){
  const d = document.createElement('div'); d.className = 'm ' + (user ? 'user' : 'bot');
  d.innerHTML = user || raw ? html : marked.parse(html);
  $('box').appendChild(d); $('box').scrollTop = $('box').scrollHeight; return d;
}
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

$('bCsv').onclick = () => $('fCsv').click(); $('bImg').onclick = () => $('fImg').click();
$('fCsv').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  if (!f.name.toLowerCase().endsWith('.csv')) return alert('Hanya file .csv yang diperbolehkan.');
  const r = new FileReader();
  r.onload = ev => { csvText = ev.target.result; addMsg(`📄 File CSV “${esc(f.name)}” berhasil dibaca. Kirim pesan untuk mulai menganalisis.`, true); };
  r.readAsText(f);
};
$('fImg').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height; const M = 800;
      if (w > h) { if (w > M) { h *= M / w; w = M; } } else if (h > M) { w *= M / h; h = M; }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      imgB64 = cv.toDataURL('image/jpeg', 0.8);
      addMsg(`📷 Foto tanaman berhasil dilampirkan.<img src="${imgB64}" alt="Foto tanaman">`, true);
    };
    img.src = ev.target.result;
  };
  r.readAsDataURL(f);
};

function localAnswer(q){
  const g = id => $(id).textContent, ph = parseFloat(g('vPh')), tanah = parseFloat(g('vTanah')), tds = parseFloat(g('vTds'));
  const notes = [];
  if (!isNaN(ph)) notes.push(ph < 6 ? `pH air **${ph.toFixed(2)}** terlalu asam; naikkan dengan kapur pertanian atau dolomit.` : ph > 8 ? `pH air **${ph.toFixed(2)}** terlalu basa; turunkan dengan asam organik atau sumber air lain.` : `pH air **${ph.toFixed(2)}** masih dalam rentang aman (6–8).`);
  if (!isNaN(tanah)) notes.push(tanah < 50 ? `Kelembapan tanah **${tanah}%** rendah; jadwalkan penyiraman.` : tanah > 75 ? `Kelembapan tanah **${tanah}%** tinggi; waspadai akar busuk dan perbaiki drainase.` : `Kelembapan tanah **${tanah}%** cukup ideal.`);
  if (!isNaN(tds)) notes.push(tds > 1000 ? `TDS **${tds} PPM** cukup tinggi; kurangi dosis pupuk cair.` : `TDS **${tds} PPM** masih wajar.`);
  return `**Ringkasan kondisi kebun (mode demo):**\n\n- ${notes.join('\n- ')}\n\n_Pertanyaan: “${q}”. Untuk AI penuh, jalankan aplikasi di Vercel dan atur GROQ_API_KEY sebagai environment variable._`;
}

async function askGroq(q){
  if (!CFG.GROQ_ENABLED) return localAnswer(q);
  const sensorData = {
    suhu: $('vSuhu').textContent,
    kelembapan_udara: $('vHum').textContent,
    rata_rata_tanah: $('vTanah').textContent,
    tds: $('vTds').textContent,
    ph: $('vPh').textContent
  };
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, sensorData, csvText, imageData: imgB64 })
    });
    const d = await r.json();
    if (!r.ok) return `**Gagal memproses.** ${esc(d.error || 'Silakan coba lagi.')}`;
    csvText = ''; imgB64 = null; $('fCsv').value = ''; $('fImg').value = '';
    return d.answer;
  } catch (e) { return '**Gagal terhubung ke server AI.** Periksa koneksi lalu coba lagi.'; }
}

async function sendMsg(){
  const t = $('inp').value.trim();
  if (!t && !csvText && !imgB64) return;
  const q = t || 'Tolong analisis data atau gambar yang saya lampirkan.';
  if (t) addMsg(esc(t), true);
  $('inp').value = '';
  const typing = addMsg('<i>Membaca dan menganalisis…</i>', false, true);
  const a = await askGroq(q);
  typing.remove(); addMsg(a);
}
$('send').onclick = sendMsg;
$('inp').addEventListener('keypress', e => { if (e.key === 'Enter') sendMsg(); });

// ---- Splash ----
function hideSplash(){ const s = $('splash'); if (!s) return; s.classList.add('out'); setTimeout(() => s.remove(), 600); }
setTimeout(hideSplash, 5000);

loadInitial();
