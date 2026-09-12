/**
 * MEMBUKA RUANG UJIAN — beban yang paling tajam sepanjang hari.
 *
 *     k6 run -e RPS=50 load-tests/exam-start.js
 *
 * Pada hari-H peserta tidak datang merata: mereka menekan "Mulai" dalam
 * rentang beberapa menit yang sama. Skenario ini meniru lonjakan itu — beranda
 * siswa (render penuh, bukan API) ditambah sinkron waktu pertamanya — dan
 * sengaja memakai `ramping-arrival-rate`, yang mengejar JUMLAH KEDATANGAN per
 * detik, bukan jumlah VU. Bedanya menentukan: kalau server melambat, VU menahan
 * diri sendiri dan bebannya ikut turun sehingga masalahnya tersembunyi;
 * kedatangan tidak menahan diri, persis seperti peserta sungguhan.
 */
import http from "k6/http";
import { check } from "k6";
import { Trend } from "k6/metrics";

import { BASE_URL, kepala, peserta } from "./lib/peserta.js";

const LAJU = Number(__ENV.RPS || 50);

const halamanMs = new Trend("adzkia_beranda_ms", true);

export const options = {
  scenarios: {
    lonjakan: {
      executor: "ramping-arrival-rate",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs: Math.min(500, LAJU * 10),
      maxVUs: 2000,
      stages: [
        { duration: "20s", target: LAJU },
        { duration: __ENV.HOLD || "40s", target: LAJU },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: {
    // Halaman penuh memang lebih berat daripada API; ambangnya disesuaikan,
    // tetapi tetap ditahan di bawah satu detik supaya peserta tidak mengira
    // halamannya menggantung lalu memuat ulang berkali-kali — dan muat ulang
    // berkali-kali itulah yang mengubah server lambat menjadi server tumbang.
    adzkia_beranda_ms: ["p(95)<1000"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const p = peserta[Math.floor(Math.random() * peserta.length)];
  const h = kepala(p);

  const halaman = http.get(`${BASE_URL}/dashboard`, h);
  halamanMs.add(halaman.timings.duration);
  check(halaman, { "beranda siswa 200": (r) => r.status === 200 });

  const k = http.get(`${BASE_URL}/api/exam/state?attemptId=${p.attemptId}`, h);
  check(k, { "state 200": (r) => r.status === 200 });
}
