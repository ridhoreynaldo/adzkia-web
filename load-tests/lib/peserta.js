/**
 * Berkas bersama seluruh skenario k6.
 *
 * Memuat daftar peserta uji beserta kuki sesinya, yang dibuat lebih dulu oleh
 * `npm run seed:beban`. SharedArray dipakai supaya 5.000 VU TIDAK menyalin
 * daftar yang sama 5.000 kali ke memori — tanpa itu, k6 sendiri yang lebih dulu
 * kehabisan memori, dan angkanya jadi mengukur k6, bukan aplikasinya.
 */
import { SharedArray } from "k6/data";

export const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3000";

const berkas = new SharedArray("peserta", function () {
  const isi = JSON.parse(open("../data/peserta.json"));
  return isi.peserta;
});

export const peserta = berkas;

/** Peserta untuk VU ini. Dibagi rata; VU melebihi jumlah peserta akan memutar ulang. */
export function pesertaSaya() {
  return berkas[(__VU - 1) % berkas.length];
}

export function kepala(p) {
  return {
    headers: {
      Cookie: p.cookie,
      "Content-Type": "application/json",
      // Aplikasi membaca header ini untuk menentukan penanda Secure pada kuki
      // dan alamat pemanggil pada pembatas laju. Diisi supaya jalurnya sama
      // persis dengan lewat nginx.
      "X-Forwarded-Proto": "http",
      "X-Forwarded-For": `10.9.${Math.floor(__VU / 250)}.${__VU % 250}`,
    },
  };
}

/**
 * Ambang yang dipakai SELURUH skenario.
 *
 * Angkanya dari brief penyetelan: p95 < 300 ms, p99 < 800 ms, galat < 1%.
 * `http_req_failed` dihitung dari status HTTP; 429 SENGAJA tidak dianggap
 * gagal di skenario yang memang menembak jauh di atas laju wajar, karena di
 * sana 429 justru bukti pembatas lajunya bekerja.
 */
export const AMBANG = {
  http_req_duration: ["p(95)<300", "p(99)<800"],
  http_req_failed: ["rate<0.01"],
};

/** Muatan autosave: satu butir, seperti yang dikirim ruang ujian saat mengetik. */
export function muatanSatu(p, i) {
  return JSON.stringify({
    attemptId: p.attemptId,
    questionId: p.soal[i % p.soal.length],
    nilai: "ABCDE"[i % 5],
    ragu: i % 7 === 0,
  });
}

/** Muatan autosave berkelompok: yang dikirim saat peserta pindah subtes. */
export function muatanBanyak(p, banyak, benih) {
  const jawaban = [];
  for (let i = 0; i < banyak; i++) {
    const n = (benih + i) % p.soal.length;
    jawaban.push({ questionId: p.soal[n], jawaban: "ABCDE"[n % 5], ragu: false });
  }
  return JSON.stringify({ attemptId: p.attemptId, jawaban });
}
