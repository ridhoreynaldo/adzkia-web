/**
 * PESERTA SERENTAK — meniru ruang ujian yang sesungguhnya.
 *
 *     k6 run -e VUS=100  load-tests/concurrent-users.js
 *     k6 run -e VUS=1000 load-tests/concurrent-users.js
 *
 * Inilah skenario yang paling berarti dari seluruh berkas di folder ini, karena
 * bentuknya sama dengan beban hari-H: tiap peserta TIDAK menembak secepat
 * mungkin, melainkan mengulang irama yang sama seperti halaman ujian —
 *
 *     denyut          tiap  5 detik
 *     sinkron waktu   tiap 15 detik
 *     autosave        tiap 30 detik
 *
 * Satu putaran di bawah mewakili 30 detik ujian: 6 denyut, 2 sinkron, 1
 * autosave. Jadi "1.000 VU" di sini benar-benar berarti 1.000 peserta yang
 * sedang mengerjakan soal — bukan 1.000 mesin yang membanjiri server.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

import { AMBANG, BASE_URL, kepala, muatanSatu, pesertaSaya } from "./lib/peserta.js";

const VUS = Number(__ENV.VUS || 100);
const HOLD = __ENV.HOLD || "1m";

const denyutMs = new Trend("adzkia_denyut_ms", true);
const jawabanMs = new Trend("adzkia_jawaban_ms", true);
const keadaanMs = new Trend("adzkia_keadaan_ms", true);
const digugurkan = new Counter("adzkia_digugurkan");
const ditolak429 = new Counter("adzkia_429");

export const options = {
  scenarios: {
    ujian: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: VUS },
        { duration: HOLD, target: VUS },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    ...AMBANG,
    // Tidak boleh ada SATU pun peserta yang digugurkan oleh beban. Ini ambang
    // yang paling penting di seluruh berkas: lebih baik server lambat daripada
    // server yang menggugurkan orang.
    adzkia_digugurkan: ["count==0"],
    adzkia_denyut_ms: ["p(95)<300"],
    adzkia_jawaban_ms: ["p(95)<300"],
  },
};

export default function () {
  const p = pesertaSaya();
  const h = kepala(p);
  const iter = __ITER;

  // 30 detik ujian = 6 denyut, 2 sinkron waktu, 1 autosave.
  for (let d = 0; d < 6; d++) {
    const r = http.post(
      `${BASE_URL}/api/exam/denyut`,
      JSON.stringify({ attemptId: p.attemptId, aktif: true, terlihat: true, percobaan: 1, subtes: "PU" }),
      h,
    );
    denyutMs.add(r.timings.duration);
    if (r.status === 429) {
      ditolak429.add(1);
    } else {
      check(r, { "denyut 200": (x) => x.status === 200 });
      if (r.status === 200 && r.json("digugurkan") === true) digugurkan.add(1);
    }

    if (d === 2 || d === 5) {
      const k = http.get(`${BASE_URL}/api/exam/state?attemptId=${p.attemptId}`, h);
      keadaanMs.add(k.timings.duration);
      if (k.status === 429) ditolak429.add(1);
      else check(k, { "state 200": (x) => x.status === 200 });
    }

    if (d === 3) {
      const j = http.post(`${BASE_URL}/api/exam/answer`, muatanSatu(p, iter), h);
      jawabanMs.add(j.timings.duration);
      if (j.status === 429) ditolak429.add(1);
      else check(j, { "answer 200": (x) => x.status === 200 });
    }

    sleep(5);
  }
}
