import { today, mulai, nilai, status, jatuhTempo, streak, daysBetween } from './srs.js';

const KEY = 'murojaah-v1';
const AUDIO_CACHE = 'audio-v1';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pad = (n) => String(n).padStart(2, '0');
const LEVEL = ['tampil', 'awal kalimat', 'sembunyi'];

const defaults = () => ({ bab: {}, riwayat: [], waktu: {}, target: null, pengaturan: { kecepatan: 1, level: 0, gelap: 'auto', font: 1.6 } });
const load = () => {
  try {
    const o = JSON.parse(localStorage.getItem(KEY));
    return o ? { ...defaults(), ...o, pengaturan: { ...defaults().pengaturan, ...o.pengaturan } } : defaults();
  } catch { return defaults(); }
};
let S = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage diblokir: app tetap jalan */ } };

let M = [];
let EST = {};
let cur = null;
let putaran = 1;
let ab = { a: null, b: null };
let blok = false;
let aktif = null;
const au = $('#au');

function toast(t) {
  const el = $('#toast');
  el.textContent = t;
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), 2200);
}

function tema() {
  const g = S.pengaturan.gelap;
  if (g === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = g === 'gelap' ? 'dark' : 'light';
  document.documentElement.style.setProperty('--f', S.pengaturan.font + 'rem');
}

const item = (id, meta = '', cls = '') =>
  `<button class="bab ${cls}" data-bab="${id}"><span class="no">${pad(id)}</span><span class="jdl" lang="ar" dir="rtl">${esc(M[id].judul)}</span><span class="meta">${meta}</span></button>`;

const tglID = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function infoJadwal(id, t) {
  const b = S.bab[id];
  if (!b) return 'belum';
  const d = daysBetween(t, b.jatuhTempo);
  return d < 0 ? `telat ${-d} hr` : d === 0 ? 'hari ini' : tglID(b.jatuhTempo);
}

const baruBerikut = () => (S.target && !S.bab[S.target.bab] ? S.target.bab : M.find((b) => !S.bab[b.id])?.id);

const render = {
  hari() {
    const t = today();
    const due = jatuhTempo(S.bab, t);
    const baru = baruBerikut();
    let h = `<div class="kartu">Streak <b>${streak(S.riwayat, t)}</b> hari`;
    if (S.target) {
      const d = daysBetween(t, S.target.tanggal);
      h += `<br>Setoran bab ${pad(S.target.bab)}: ${d >= 0 ? d + ' hari lagi' : 'terlewat ' + -d + ' hari'}`;
    }
    h += '</div>';
    h += `<h3>Murojaah (${due.length})</h3>`;
    if (due.length) {
      h += `<button class="utama" id="mm" style="width:100%">Mulai murojaah (teks disembunyikan)</button>`;
      h += due.map((id) => item(id, infoJadwal(id, t), S.bab[id].jatuhTempo < t ? 'telat' : '')).join('');
    } else h += '<p class="muted">Tidak ada bab jatuh tempo.</p>';
    if (baru !== undefined) h += `<h3>Hafalan baru</h3>${item(baru, 'berikutnya')}`;
    $('#hari').innerHTML = h;
    $('#mm')?.addEventListener('click', () => { S.pengaturan.level = 2; save(); bukaBab(due[0]); });
  },
  daftar() {
    const t = today();
    const q = $('#cari').value.trim();
    $('#daftarIsi').innerHTML = M.filter((b) => !q || b.judul.includes(q) || pad(b.id).includes(q))
      .map((b) => item(b.id, `${Math.round(b.durasi / 6) / 10} mnt · ${infoJadwal(b.id, t)}`)).join('');
  },
  baca() {
    $('#level').textContent = 'Teks: ' + LEVEL[S.pengaturan.level];
    renderTeks();
    renderAksi();
  },
  progres() {
    const t = today();
    const n = { belum: 0, proses: 0, hafal: 0 };
    M.forEach((b) => n[status(S.bab[b.id])]++);
    const tgt = S.target || { bab: baruBerikut() ?? 0, tanggal: t };
    let h = `<div class="kartu">Hafal <b>${n.hafal}</b> · Proses <b>${n.proses}</b> · Belum <b>${n.belum}</b> dari ${M.length}</div>`;
    h += `<div class="grid">${M.map((b) => `<button data-bab="${b.id}" class="s-${status(S.bab[b.id])}">${pad(b.id)}</button>`).join('')}</div>`;
    h += `<h3>Target setoran</h3><div class="baris"><select id="tb">${M.map((b) => `<option value="${b.id}" ${b.id === tgt.bab ? 'selected' : ''}>Bab ${pad(b.id)}</option>`).join('')}</select><input id="tt" type="date" value="${tgt.tanggal}"><button id="ts">Simpan</button></div>`;
    h += `<h3>Offline &amp; cadangan</h3><div class="baris"><button id="unduh">Unduh semua audio (±70 MB)</button><span id="us" class="muted"></span></div>`;
    h += `<div class="baris"><button id="eks">Ekspor data</button><button id="imp">Impor data</button><input id="impf" type="file" accept="application/json" hidden></div>`;
    h += `<h3>Pengaturan</h3><div class="baris"><button id="reset" class="bahaya">Reset app</button><span class="muted">Hapus semua progres, riwayat, target, tanda blok, audio unduhan.</span></div>`;
    h += `<h3>Riwayat</h3>` + (S.riwayat.slice(-30).reverse().map((r) => `<div class="muted">${tglID(r.t)} · bab ${pad(r.bab)} · ${r.nilai}</div>`).join('') || '<p class="muted">Belum ada.</p>');
    $('#progres').innerHTML = h;
    $('#ts').onclick = () => { S.target = { bab: +$('#tb').value, tanggal: $('#tt').value }; save(); toast('Target disimpan'); };
    $('#unduh').onclick = unduhAudio;
    $('#reset').onclick = resetApp;
    $('#eks').onclick = ekspor;
    $('#imp').onclick = () => $('#impf').click();
    $('#impf').onchange = impor;
    jumlahTersimpan();
  },
};

function tampil(tab) {
  document.querySelectorAll('main > section').forEach((s) => { s.hidden = s.id !== tab; });
  document.querySelectorAll('nav button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tab));
  render[tab]();
}

// --- baca / hafal ---
function renderTeks() {
  const b = M[cur];
  if (!b) { $('#teks').innerHTML = ''; return; }
  if (!b.potongan.length) { $('#teks').innerHTML = '<p class="muted" dir="ltr">Teks bab ini belum diisi. Audio tetap bisa dipakai.</p>'; return; }
  const lv = S.pengaturan.level;
  $('#teks').innerHTML = b.potongan.map((p) => {
    const w = p.teks.split(/\s+/);
    const isi = lv === 0 ? esc(p.teks)
      : lv === 1 ? `${esc(w.slice(0, 3).join(' '))} <span class="tutup">${esc(w.slice(3).join(' '))}</span>`
      : `<span class="tutup">${esc(p.teks)}</span>`;
    if (!blok) return `<div class="pot">${isi}</div>`;
    const r = rentang(p.n);
    const man = !!S.waktu[cur]?.[p.n]?.[1];
    return `<div class="pot blok${aktif === p.n ? ' aktif buka' : ''}" data-n="${p.n}">${isi}<div class="bar" dir="ltr"><span class="muted">${r ? mnt(r[0]) + '–' + mnt(r[1]) + (man ? '' : ' (perkiraan)') : 'belum ada waktu'}</span><button data-act="a-">Awal −</button><button data-act="a+">Awal +</button><button data-act="b-">Akhir −</button><button data-act="b+">Akhir +</button><button data-act="mulai">Mulai</button><button data-act="selesai">Selesai</button>${man ? '<button data-act="hapus">Reset</button>' : ''}</div></div>`;
  }).join('');
}

const mnt = (t) => `${Math.floor(t / 60)}:${pad(Math.floor(t % 60))}`;

function stopBlok() {
  aktif = null;
  ab = { a: null, b: null };
  $('#ab').textContent = 'Loop A';
}

const rentang = (n) => {
  const m = S.waktu[cur]?.[n];
  return m && m[1] != null ? m : EST[cur]?.[n - 1] ?? null;
};

function pasangLoop(n) {
  const r = rentang(n);
  aktif = n;
  ab = { a: r[0], b: r[1] };
  $('#ab').textContent = 'Hapus A–B';
}

function mulaiDi(t) {
  if (au.readyState >= 1) au.currentTime = t;
  else au.addEventListener('loadedmetadata', () => { au.currentTime = t; }, { once: true });
}

function klikBlok(e) {
  const el = e.target.closest('.pot');
  if (!el) return;
  const n = +el.dataset.n;
  const act = e.target.dataset.act;
  const w = (S.waktu[cur] ??= {});
  if (act) {
    const r = rentang(n);
    if (act === 'mulai') w[n] = [au.currentTime, r && r[1] > au.currentTime ? r[1] : null];
    else if (act === 'selesai') {
      if (!r || au.currentTime <= r[0]) return toast('Selesai harus setelah awal');
      w[n] = [r[0], au.currentTime];
    } else if (act === 'hapus') delete w[n];
    else if (r) {
      const d = act[1] === '+' ? 0.5 : -0.5;
      w[n] = act[0] === 'a' ? [Math.max(0, r[0] + d), r[1]] : [r[0], Math.min(au.duration || r[1] + 1, r[1] + d)];
      if (w[n][1] - w[n][0] < 0.5) return toast('Blok terlalu pendek');
    }
    if (aktif === n && rentang(n)) { pasangLoop(n); mulaiDi(ab.a); }
    else if (aktif === n) stopBlok();
    save();
    renderTeks();
    return;
  }
  if (aktif === n) { stopBlok(); au.pause(); }
  else if (rentang(n)) {
    pasangLoop(n);
    mulaiDi(ab.a);
    au.play().catch(() => toast('Audio belum bisa diputar. Tekan play sekali.'));
  } else return toast('Waktu blok ini belum ada. Putar audio lalu tekan Mulai dan Selesai.');
  renderTeks();
}

function renderAksi() {
  if (cur === null) { $('#aksi').innerHTML = ''; return; }
  const b = S.bab[cur];
  $('#aksi').innerHTML = b
    ? `<p class="muted">Nilai murojaah kamu:</p><div class="nilai"><button data-n="lupa">Lupa</button><button data-n="ragu">Ragu</button><button data-n="lancar" class="utama">Lancar</button></div><p class="muted">Kotak ${b.kotak} · ${infoJadwal(cur, today())}</p>`
    : `<button class="utama" id="mulaiHafal" style="width:100%">Mulai hafal bab ini</button>`;
}

function bukaBab(id) {
  cur = id;
  const b = M[id];
  if (!au.src.endsWith(b.audio)) au.src = b.audio;
  au.playbackRate = S.pengaturan.kecepatan;
  putaran = 1;
  ab = { a: null, b: null };
  aktif = null;
  $('#ab').textContent = 'Loop A';
  hit();
  $('#judul').textContent = `${pad(id)}. ${b.judul}`;
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: b.judul, artist: 'Kitab Tauhid', album: 'Mustawa 2' });
  }
  tampil('baca');
}

const hit = () => { $('#hit').textContent = `${putaran}/${+$('#ulang').value || '∞'}`; };

au.addEventListener('ended', () => {
  const n = +$('#ulang').value;
  if (n === 0 || putaran < n) { putaran++; hit(); au.currentTime = 0; au.play(); }
});
au.addEventListener('timeupdate', () => {
  if (ab.b !== null && au.currentTime >= ab.b) au.currentTime = ab.a;
});
$('#ulang').onchange = () => { putaran = 1; hit(); };
$('#kec').value = S.pengaturan.kecepatan;
$('#kec').onchange = (e) => { S.pengaturan.kecepatan = au.playbackRate = +e.target.value; save(); };
$('#m5').onclick = () => { au.currentTime = Math.max(0, au.currentTime - 5); };
$('#p5').onclick = () => { au.currentTime += 5; };
$('#ab').onclick = () => {
  if (ab.a === null) { ab.a = au.currentTime; $('#ab').textContent = 'Loop B'; }
  else if (ab.b === null) {
    if (au.currentTime <= ab.a) return toast('B harus setelah A');
    ab.b = au.currentTime; $('#ab').textContent = 'Hapus A–B';
  } else { stopBlok(); renderTeks(); }
};
$('#level').onclick = () => { S.pengaturan.level = (S.pengaturan.level + 1) % 3; save(); render.baca(); };
$('#fk').onclick = () => { S.pengaturan.font = Math.max(1, S.pengaturan.font - 0.2); save(); tema(); };
$('#fb').onclick = () => { S.pengaturan.font = Math.min(3, S.pengaturan.font + 0.2); save(); tema(); };
$('#buka').onclick = () => {
  const p = [...document.querySelectorAll('.pot')];
  const semua = p.every((x) => x.classList.contains('buka'));
  p.forEach((x) => x.classList.toggle('buka', !semua));
};
$('#blok').onclick = () => {
  blok = !blok;
  stopBlok();
  $('#blok').textContent = blok ? 'Mode blok: aktif' : 'Mode blok';
  renderTeks();
};
$('#teks').addEventListener('click', (e) => (blok ? klikBlok(e) : e.target.closest('.pot')?.classList.toggle('buka')));
$('#aksi').addEventListener('click', (e) => {
  if (e.target.id === 'mulaiHafal') { S.bab[cur] = mulai(today()); save(); renderAksi(); return; }
  const n = e.target.dataset.n;
  if (!n) return;
  S.bab[cur] = nilai(S.bab[cur], n, today());
  S.riwayat.push({ t: today(), bab: cur, nilai: n });
  save();
  toast(`Berikutnya: ${infoJadwal(cur, today())}`);
  renderAksi();
});

if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => au.play());
  ms.setActionHandler('pause', () => au.pause());
  ms.setActionHandler('seekbackward', () => { au.currentTime -= 5; });
  ms.setActionHandler('seekforward', () => { au.currentTime += 5; });
  ms.setActionHandler('previoustrack', () => cur > 0 && bukaBab(cur - 1));
  ms.setActionHandler('nexttrack', () => cur < M.length - 1 && bukaBab(cur + 1));
}

// --- offline & cadangan ---
async function jumlahTersimpan() {
  if (!('caches' in window)) return;
  const n = (await (await caches.open(AUDIO_CACHE)).keys()).length;
  const el = $('#us');
  if (el) el.textContent = `Tersimpan ${n}/${M.length}`;
}

async function unduhAudio() {
  try {
    navigator.storage?.persist?.();
    const c = await caches.open(AUDIO_CACHE);
    for (const b of M) {
      if (!(await c.match(b.audio))) {
        const r = await fetch(b.audio);
        if (!r.ok) throw new Error(b.audio + ' ' + r.status);
        await c.put(b.audio, r);
      }
      $('#us').textContent = `Mengunduh ${b.id + 1}/${M.length}…`;
    }
    toast('Semua audio tersimpan');
  } catch (e) { toast('Gagal: ' + e.message); }
  jumlahTersimpan();
}

async function resetApp() {
  if (!confirm('Reset app? Semua progres, riwayat, target, tanda blok, dan audio unduhan akan dihapus. Ekspor data dulu kalau perlu.')) return;
  try { localStorage.removeItem(KEY); } catch { /* abaikan */ }
  try { for (const k of await caches.keys()) await caches.delete(k); } catch { /* abaikan */ }
  try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch { /* abaikan */ }
  location.reload();
}

function ekspor() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' }));
  a.download = `murojaah-backup-${today()}.json`;
  a.click();
}

async function impor(e) {
  try {
    const o = JSON.parse(await e.target.files[0].text());
    if (typeof o.bab !== 'object' || !Array.isArray(o.riwayat)) throw new Error('format salah');
    S = { ...defaults(), ...o };
    save(); tema(); tampil('progres'); toast('Data dipulihkan');
  } catch (err) { toast('Gagal impor: ' + err.message); }
}

// --- start ---
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab]');
  if (t) return tampil(t.dataset.tab);
  const b = e.target.closest('[data-bab]');
  if (b) bukaBab(+b.dataset.bab);
});
$('#cari').oninput = render.daftar;
$('#tema').onclick = () => {
  const o = ['auto', 'terang', 'gelap'];
  S.pengaturan.gelap = o[(o.indexOf(S.pengaturan.gelap) + 1) % 3];
  save(); tema(); toast('Tema: ' + S.pengaturan.gelap);
};

tema();
fetch('data/waktu.json').then((r) => r.json()).catch(() => ({}))
  .then((w) => { EST = w; return fetch('data/matan.json'); }).then((r) => r.json()).then((d) => { M = d; tampil('hari'); })
  .catch(() => { $('#hari').textContent = 'Gagal memuat data/matan.json'; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
