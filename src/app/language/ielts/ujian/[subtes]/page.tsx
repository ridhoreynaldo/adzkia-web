import { redirect } from "next/navigation";

import { LayarGagalIelts } from "@/components/language/LayarGagalIelts";
import { RuangIelts, type SeksiRuang, type SoalRuang } from "@/components/language/RuangIelts";
import { getSession } from "@/lib/auth/auth";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import {
  jawabanTersimpan,
  keSubtesIelts,
  menitPaket,
  paketById,
  pengerjaanBerjalan,
  pengerjaanTerakhir,
  seksiSubtes,
  sisaDetik,
  soalUntukPeserta,
  statusPortalIelts,
  subtesBerjalan,
  subtesIelts,
} from "@/lib/ielts/ielts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ subtes: string }> }) {
  const { subtes } = await params;
  const s = subtesIelts(subtes);
  return { title: s ? `${s.nama} — IELTS` : "IELTS" };
}

/**
 * Ruang ujian satu subtes.
 *
 * Halaman ini hanya menyiapkan bahan dan menjaga pintunya; seluruh perilakunya
 * — hitung mundur, simpan otomatis, pemutar sekali jalan — ada di komponen
 * `RuangIelts` yang hidup di peramban.
 *
 * Yang dijaga di sini, semuanya di server: fitur aktif, ada sesi siswa, portal
 * tidak dikunci, subtesnya memang sudah dibuka, dan waktunya belum habis.
 * Alamat halaman ini bisa diketik siapa saja.
 */
export default async function RuangIeltsPage({
  params,
}: {
  params: Promise<{ subtes: string }>;
}) {
  await wajibFiturLanguage();
  const user = await getSession();
  if (!user) redirect("/language/login?next=%2Flanguage%2Fielts%2Fujian");
  if ((await statusPortalIelts()).terkunci && user.role !== "admin") redirect("/language/ielts");

  const { subtes: mentah } = await params;
  const kode = keSubtesIelts(mentah);
  if (!kode) redirect("/language/ielts/ujian");
  const def = subtesIelts(kode)!;

  // Ujian yang DIHENTIKAN dirender ulang dari status yang tersimpan di server,
  // bukan dari keadaan peramban. Inilah yang membuat layar merah tidak bisa
  // dibatalkan dengan memuat ulang halaman atau membersihkan storage.
  const terakhir = await pengerjaanTerakhir(user.id);
  if (terakhir?.status === "gugur") {
    return (
      <LayarGagalIelts
        pesan={terakhir.alasan_gugur ?? "Ujian IELTS kamu dihentikan karena pelanggaran."}
        namaPaket={(await paketById(terakhir.paket_id))?.nama}
        waktu={terakhir.digugurkan_at}
      />
    );
  }

  const p = await pengerjaanBerjalan(user.id);
  if (!p) redirect("/language/ielts");
  if (!p.setuju_at) redirect(`/language/ielts/rules?paket=${p.paket_id}`);

  // Subtes yang belum dibuka tidak boleh dimasuki lewat alamat; yang sudah
  // ditutup juga tidak — keduanya dikembalikan ke papan pilih subtes.
  const jalan = await subtesBerjalan(p.id, kode);
  if (!jalan) redirect("/language/ielts/ujian");
  const sisa = await sisaDetik(p.id, kode);
  if (jalan.selesai_at || sisa <= 0) {
    // Dua sebab yang harus dibedakan bunyinya: siswa yang menutup sendiri
    // subtesnya tidak boleh dikabari bahwa "waktunya habis" — ia akan mengira
    // ada waktu yang hilang.
    const kabar = jalan.selesai_at
      ? `${def.nama} sudah kamu tutup dan tidak bisa dibuka lagi.`
      : `Waktu ${def.nama} sudah habis.`;
    redirect(`/language/ielts/ujian?pesan=${encodeURIComponent(kabar)}`);
  }

  const seksi: SeksiRuang[] = (await seksiSubtes(p.paket_id, kode)).map((s) => ({
    id: s.id,
    nomor: s.nomor,
    judul: s.judul || `${def.labelSeksi} ${s.nomor}`,
    instruksi: s.instruksi,
    audioUrl: s.audio_url,
    bacaan: s.bacaan,
  }));

  const soal: SoalRuang[] = (await soalUntukPeserta(p.paket_id, kode)).map((s) => ({
    id: s.id,
    nomor: s.nomor,
    tipe: s.tipe,
    pertanyaan: s.pertanyaan,
    opsi: s.opsi,
    seksiId: s.seksiId,
  }));

  return (
    <RuangIelts
      pengerjaanId={p.id}
      namaPaket={(await paketById(p.paket_id))?.nama ?? "IELTS"}
      subtes={kode}
      namaSubtes={def.nama}
      menit={(await menitPaket(p.paket_id))[kode]}
      labelSeksi={def.labelSeksi}
      seksi={seksi}
      soal={soal}
      jawabanAwal={await jawabanTersimpan(p.id, kode)}
      sisaDetikAwal={sisa}
    />
  );
}
