/**
 * Menarik katalog resmi PTN + program studi SNBT dari portal SNPMB.
 *
 *     node scripts/tarik-snpmb.mjs
 *
 * Hasilnya ditulis ke scripts/snpmb-2026.json supaya proses impor ke basis
 * data (scripts/impor-snpmb.mjs) tidak perlu memukul server SNPMB lagi.
 *
 * Dua endpoint yang dipakai adalah yang sama dengan yang dipanggil halaman
 * "Daya Tampung SNBT" di snpmb.id — data publik, tanpa autentikasi:
 *
 *   /proxy-ptn-sb.php              -> daftar seluruh PTN peserta SNBT
 *   /proxy-prodi-sb.php?ptn=<id>   -> prodi satu PTN, memakai id_ptn (BUKAN
 *                                     kode_ptn; memakai kode_ptn menghasilkan
 *                                     daftar kosong tanpa pesan galat)
 *
 * Yang disimpan hanya kolom yang benar-benar dipakai. `history_peminat_provinsi`
 * sengaja dibuang — isinya 34 provinsi x 5 tahun per prodi dan tidak terpakai.
 *
 * CATATAN: SNPMB TIDAK pernah menerbitkan nilai minimum diterima (passing
 * grade). Yang tersedia hanya daya tampung dan jumlah peminat. Ancar-ancar
 * skor diturunkan belakangan di scripts/impor-snpmb.mjs.
 */
import fs from "node:fs";
import path from "node:path";

const ASAL = "https://snpmb.id";
const KELUARAN = path.join(import.meta.dirname, "snpmb-2026.json");

/** Jeda antar permintaan supaya portal SNPMB tidak dibanjiri. */
const JEDA_MS = 200;
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

async function ambilJson(url, percobaan = 3) {
  for (let i = 1; i <= percobaan; i++) {
    try {
      const r = await fetch(url, {
        headers: {
          // Portal menolak permintaan tanpa User-Agent peramban.
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
          Accept: "application/json",
          Referer: `${ASAL}/utbk-snbt/daya-tampung-snbt`,
        },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i === percobaan) throw e;
      await tidur(JEDA_MS * i * 3);
    }
  }
}

/** Tahun terbaru pada riwayat yang benar-benar punya angka peminat. */
function riwayatTerbaru(riwayat) {
  const bersih = (riwayat ?? [])
    .filter((h) => Number(h.peminat) > 0 && Number(h.daya_tampung) > 0)
    .sort((a, b) => a.tahun - b.tahun);
  return bersih.length ? bersih[bersih.length - 1] : null;
}

const mulai = Date.now();
console.log("Mengambil daftar PTN…");
const ptnMentah = await ambilJson(`${ASAL}/proxy-ptn-sb.php`);
console.log(`  ${ptnMentah.length} PTN.`);

const hasil = [];
let totalProdi = 0;
let tanpaProdi = 0;

for (let i = 0; i < ptnMentah.length; i++) {
  const p = ptnMentah[i];
  const prov = p.provinsi?.[0]?.nama_prov1 ?? null;

  let prodiMentah = [];
  try {
    prodiMentah = await ambilJson(`${ASAL}/proxy-prodi-sb.php?ptn=${p.id_ptn}`);
  } catch (e) {
    console.log(`  ! ${p.nama}: gagal (${e.message})`);
  }
  if (!Array.isArray(prodiMentah)) prodiMentah = [];
  if (prodiMentah.length === 0) tanpaProdi++;

  const prodi = prodiMentah.map((q) => {
    const t = riwayatTerbaru(q.history_daya_tampung);
    return {
      nama: String(q.nama ?? "").trim(),
      jenjang: String(q.jenjang ?? "").trim() || null,
      // Daya tampung yang ditawarkan pada SNBT tahun berjalan.
      dayaTampung: Number(q.daya_tampung_snbt) || null,
      // Angka peminat terakhir yang tercatat, beserta tahunnya.
      peminat: t ? Number(t.peminat) : null,
      dayaTampungRiwayat: t ? Number(t.daya_tampung) : null,
      tahunRiwayat: t ? Number(t.tahun) : null,
    };
  });

  totalProdi += prodi.length;
  hasil.push({
    nama: String(p.nama ?? "").trim(),
    idPtn: p.id_ptn,
    provinsi: prov,
    jenis: p.is_ptkin ? "PTKIN" : p.is_vokasi ? "Vokasi" : "Akademik",
    prodi,
  });

  const urut = String(i + 1).padStart(3, " ");
  console.log(`  ${urut}/${ptnMentah.length}  ${p.nama} — ${prodi.length} prodi`);
  await tidur(JEDA_MS);
}

fs.writeFileSync(
  KELUARAN,
  JSON.stringify(
    { diambilPada: new Date().toISOString(), sumber: ASAL, ptn: hasil },
    null,
    1,
  ),
);

const detik = Math.round((Date.now() - mulai) / 1000);
console.log(
  `\nSelesai dalam ${detik}s: ${hasil.length} PTN, ${totalProdi} prodi` +
    (tanpaProdi ? ` (${tanpaProdi} PTN tidak mengembalikan prodi)` : "") +
    `\nTersimpan di ${KELUARAN}`,
);
