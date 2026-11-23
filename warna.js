// Susun teks satu potongan: warna font per frasa (opsional) + level sembunyi.
// Frasa berakhir di tanda baca atau setelah MAKS kata. st.k dibawa antar potongan
// agar warna terus berganti dari blok ke blok.
const MAKS = 6;
const AKHIR = /[،؛:.!؟?»﴾)]$/;

export function susun(teks, lv, warna, st, esc) {
  let run = 0;
  const w = teks.split(/\s+/).filter(Boolean).map((x) => {
    const k = st.k;
    if (AKHIR.test(x) || ++run >= MAKS) { st.k = (st.k + 1) % 3; run = 0; }
    return warna && k ? `<span class="k${k}">${esc(x)}</span>` : esc(x);
  });
  if (lv === 0) return w.join(' ');
  if (lv === 1) return `${w.slice(0, 3).join(' ')} <span class="tutup">${w.slice(3).join(' ')}</span>`;
  return `<span class="tutup">${w.join(' ')}</span>`;
}
