/**
 * AUTOSAVE — kiriman jawaban, termasuk kiriman besar di akhir subtes.
 *
 *     k6 run -e VUS=200 load-tests/answer-submit.js
 *     k6 run -e VUS=200 -e BUTIR=40 load-tests/answer-submit.js
 *
 * Dua bentuk kiriman diukur berdampingan, karena biayanya sangat berbeda — dan
 * yang KEDUA-lah yang dulu meledak:
 *
 *   · satu butir     — terjadi tiap kali peserta mengetuk pilihan;
 *   · BUTIR butir    — terjadi saat peserta menutup subtes, dan terjadi pada
 *                      SEMUA peserta dalam rentang menit yang sama.
 *
 * Sebelum diperbaiki, kiriman 40 butir berarti 163 query berurutan. Sekarang 3,
 * berapa pun jumlah butirnya — dan skenario ini yang membuktikannya di bawah
 * beban, bukan di atas kertas.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

import { AMBANG, BASE_URL, kepala, muatanBanyak, muatanSatu, pesertaSaya } from "./lib/peserta.js";

const VUS = Number(__ENV.VUS || 200);
const BUTIR = Number(__ENV.BUTIR || 20);
const HOLD = __ENV.HOLD || "1m";

const satuMs = new Trend("adzkia_autosave_satu_ms", true);
const banyakMs = new Trend("adzkia_autosave_banyak_ms", true);

export const options = {
  scenarios: {
    autosave: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: VUS },
        { duration: HOLD, target: VUS },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: {
    ...AMBANG,
    adzkia_autosave_satu_ms: ["p(95)<300"],
    // Kiriman besar diberi ambang lebih longgar: muatannya memang lebih berat
    // di kabel, meski jumlah query-nya sama.
    adzkia_autosave_banyak_ms: ["p(95)<500"],
  },
};

export default function () {
  const p = pesertaSaya();
  const h = kepala(p);

  const a = http.post(`${BASE_URL}/api/exam/answer`, muatanSatu(p, __ITER), h);
  satuMs.add(a.timings.duration);
  check(a, { "satu butir tersimpan": (r) => r.status === 200 && r.json("tersimpan") === 1 });

  const b = http.post(`${BASE_URL}/api/exam/answer`, muatanBanyak(p, BUTIR, __ITER), h);
  banyakMs.add(b.timings.duration);
  check(b, { "kiriman besar tersimpan utuh": (r) => r.status === 200 && r.json("tersimpan") === BUTIR });

  sleep(1);
}
