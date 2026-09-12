/**
 * DASAR — beban ringan yang stabil, untuk membandingkan antar perubahan.
 *
 *     k6 run load-tests/baseline.js
 *
 * Bukan untuk mencari langit-langit sistem, melainkan untuk punya ANGKA ACUAN
 * yang bentuknya selalu sama: 50 peserta, satu menit, irama ujian yang wajar.
 * Jalankan sebelum dan sesudah setiap penyetelan; yang dibandingkan bukan
 * besarnya angka, melainkan pergeserannya.
 */
import http from "k6/http";
import { check, sleep } from "k6";

import { AMBANG, BASE_URL, kepala, muatanSatu, pesertaSaya } from "./lib/peserta.js";

export const options = {
  vus: Number(__ENV.VUS || 50),
  duration: __ENV.DURATION || "1m",
  thresholds: AMBANG,
};

export default function () {
  const p = pesertaSaya();
  const h = kepala(p);

  check(
    http.post(
      `${BASE_URL}/api/exam/denyut`,
      JSON.stringify({ attemptId: p.attemptId, aktif: true, terlihat: true, percobaan: 1, subtes: "PU" }),
      h,
    ),
    { "denyut 200": (r) => r.status === 200 },
  );

  check(http.get(`${BASE_URL}/api/exam/state?attemptId=${p.attemptId}`, h), {
    "state 200": (r) => r.status === 200,
  });

  check(http.post(`${BASE_URL}/api/exam/answer`, muatanSatu(p, __ITER), h), {
    "answer 200": (r) => r.status === 200,
  });

  sleep(1);
}
