import assert from 'node:assert/strict';
import { susun } from './warna.js';

const esc = (s) => s.replace(/</g, '&lt;');
const st = { k: 0 };
const h = susun('قال: هذا حق، والجنة حق.', 0, true, st, esc);
// frasa 1 tanpa warna (k0), frasa 2 biru (k1), frasa 3 merah (k2)
assert.equal(h, 'قال: <span class="k1">هذا</span> <span class="k1">حق،</span> <span class="k2">والجنة</span> <span class="k2">حق.</span>');
assert.equal(st.k, 0, 'warna berputar 3 dan lanjut ke potongan berikut');
assert.equal(susun('a b c d e f g h', 0, true, { k: 0 }, esc).split('k1').length - 1, 2, 'frasa tanpa tanda baca dipotong per 6 kata');
assert.equal(susun('a b c d', 1, false, { k: 0 }, esc), 'a b c <span class="tutup">d</span>');
assert.equal(susun('a b', 2, false, { k: 0 }, esc), '<span class="tutup">a b</span>');
assert.equal(susun('<x>', 0, false, { k: 0 }, esc), '&lt;x>');
console.log('ok');
