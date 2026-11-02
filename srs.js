export const INTERVAL = [0, 1, 2, 4, 7, 15, 30];

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5);

export const mulai = (hari) => ({ kotak: 0, jatuhTempo: hari, mulai: hari });

// nilai: 'lupa' | 'ragu' | 'lancar'
export function nilai(b, n, hari) {
  const kotak = n === 'lancar' ? Math.min(b.kotak + 1, 6) : n === 'lupa' ? 1 : b.kotak;
  return { ...b, kotak, jatuhTempo: addDays(hari, INTERVAL[kotak]) };
}

export const status = (b) => (!b ? 'belum' : b.kotak >= 3 ? 'hafal' : 'proses');

// id bab yang jatuh tempo, paling terlambat dulu
export const jatuhTempo = (bab, hari) =>
  Object.entries(bab)
    .filter(([, b]) => b.jatuhTempo <= hari)
    .sort((a, b) => a[1].jatuhTempo.localeCompare(b[1].jatuhTempo) || a[0] - b[0])
    .map(([id]) => +id);

// hari berturut-turut ada penilaian; hari ini belum dinilai tidak memutus streak
export function streak(riwayat, hari) {
  const days = new Set(riwayat.map((r) => r.t));
  let d = days.has(hari) ? hari : addDays(hari, -1);
  let n = 0;
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
