/**
 * ASAP — satu peserta, satu putaran, memeriksa BENAR-nya sebelum mengukur cepat.
 *
 *     k6 run load-tests/smoke.js
 *
 * Uji beban yang dijalankan di atas jalur yang rusak hanya menghasilkan angka
 * indah tentang halaman galat. Berkas ini dijalankan LEBIH DULU, selalu: ia
 * memastikan sesi diterima, denyut menjawab, jawaban benar-benar tersimpan,
 * dan timer terbaca — baru sesudah itu skenario lain boleh dipercaya.
 */
import http from "k6/http";
import { check, fail } from "k6";

import { BASE_URL, kepala, muatanBanyak, muatanSatu, pesertaSaya } from "./lib/peserta.js";

export const options = { vus: 1, iterations: 1, thresholds: { checks: ["rate==1"] } };

export default function () {
  const p = pesertaSaya();
  const h = kepala(p);

  const sehat = http.get(`${BASE_URL}/api/sehat`);
  if (!check(sehat, { "sehat 200": (r) => r.status === 200 })) {
    fail(`/api/sehat menjawab ${sehat.status} — aplikasinya belum hidup?`);
  }
  check(sehat, {
    "basis data siap": (r) => r.json("layanan.postgres.siap") === true,
    "cache dilaporkan": (r) => r.json("layanan.redis") !== undefined,
  });

  const keadaan = http.get(`${BASE_URL}/api/exam/state?attemptId=${p.attemptId}`, h);
  check(keadaan, {
    "state 200": (r) => r.status === 200,
    "state ok": (r) => r.json("ok") === true,
    "sesi diterima (bukan 401)": (r) => r.status !== 401,
    "subtes terbaca": (r) => r.json("subtes") !== null,
  });
  if (keadaan.status === 401) fail("Kuki sesi ditolak — jalankan ulang `npm run seed:beban`.");

  const denyut = http.post(
    `${BASE_URL}/api/exam/denyut`,
    JSON.stringify({ attemptId: p.attemptId, aktif: true, terlihat: true, percobaan: 1, subtes: "PU" }),
    h,
  );
  check(denyut, {
    "denyut 200": (r) => r.status === 200,
    "denyut tidak menggugurkan": (r) => r.json("digugurkan") !== true,
  });

  const satu = http.post(`${BASE_URL}/api/exam/answer`, muatanSatu(p, 0), h);
  check(satu, {
    "answer 200": (r) => r.status === 200,
    "satu butir tersimpan": (r) => r.json("tersimpan") === 1,
  });

  const banyak = http.post(`${BASE_URL}/api/exam/answer`, muatanBanyak(p, 20, 5), h);
  check(banyak, {
    "answer berkelompok 200": (r) => r.status === 200,
    "20 butir tersimpan sekaligus": (r) => r.json("tersimpan") === 20,
    "tidak ada yang ditolak": (r) => (r.json("ditolak") || []).length === 0,
  });

  // Kiriman yang SAMA PERSIS diulang — harus tetap 20, bukan menggandakan
  // baris dan bukan galat. Inilah sifat idempoten yang dijaga `ON CONFLICT`.
  const ulang = http.post(`${BASE_URL}/api/exam/answer`, muatanBanyak(p, 20, 5), h);
  check(ulang, { "kiriman ulang tetap diterima": (r) => r.status === 200 && r.json("tersimpan") === 20 });

  // Butir kembar dalam SATU kiriman — dulu ini menggagalkan seluruh kiriman
  // dengan galat 21000.
  const kembar = http.post(
    `${BASE_URL}/api/exam/answer`,
    JSON.stringify({
      attemptId: p.attemptId,
      jawaban: [
        { questionId: p.soal[0], jawaban: "A", ragu: false },
        { questionId: p.soal[0], jawaban: "B", ragu: false },
        { questionId: p.soal[1], jawaban: "C", ragu: false },
      ],
    }),
    h,
  );
  check(kembar, { "butir kembar tidak menggagalkan kiriman": (r) => r.status === 200 });
}
