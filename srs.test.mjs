import assert from 'node:assert/strict';
import { nilai, mulai, addDays, jatuhTempo, streak, status } from './srs.js';

let b = mulai('2026-01-30');
assert.equal(b.kotak, 0);
b = nilai(b, 'lancar', '2026-01-30');
assert.deepEqual([b.kotak, b.jatuhTempo], [1, '2026-01-31']);
b = nilai(b, 'lancar', '2026-01-31');
assert.deepEqual([b.kotak, b.jatuhTempo], [2, '2026-02-02']); // lintas bulan
b = nilai(b, 'ragu', '2026-02-02');
assert.equal(b.kotak, 2);
b = nilai(b, 'lupa', '2026-02-02');
assert.deepEqual([b.kotak, b.jatuhTempo], [1, '2026-02-03']);
for (let i = 0; i < 10; i++) b = nilai(b, 'lancar', '2026-03-01');
assert.deepEqual([b.kotak, b.jatuhTempo], [6, '2026-03-31']); // batas kotak 6
assert.equal(addDays('2026-12-31', 1), '2027-01-01');
assert.equal(status(undefined), 'belum');
assert.equal(status({ kotak: 2 }), 'proses');
assert.equal(status({ kotak: 3 }), 'hafal');

const bab = { 5: { kotak: 1, jatuhTempo: '2026-02-01' }, 2: { kotak: 1, jatuhTempo: '2026-01-20' }, 9: { kotak: 1, jatuhTempo: '2026-03-01' } };
assert.deepEqual(jatuhTempo(bab, '2026-02-10'), [2, 5]);

const r = (t) => ({ t });
assert.equal(streak([r('2026-02-09'), r('2026-02-10'), r('2026-02-08')], '2026-02-10'), 3);
assert.equal(streak([r('2026-02-09'), r('2026-02-08')], '2026-02-10'), 2); // hari ini belum
assert.equal(streak([r('2026-02-07')], '2026-02-10'), 0);
console.log('ok');
