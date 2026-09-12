import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Badge, EmptyState } from "@/components/ui";
import { AnalisisSingkat } from "@/components/hasil/AnalisisSingkat";
import { GayaCetak } from "@/components/hasil/GayaCetak";
import { KartuSkorTotal } from "@/components/hasil/KartuSkorTotal";
import { KopCetak } from "@/components/hasil/KopCetak";
import { Pembahasan, type KelompokPembahasan } from "@/components/hasil/Pembahasan";
import { PilihanProdi } from "@/components/hasil/PilihanProdi";
import { RekomendasiKampus } from "@/components/hasil/RekomendasiKampus";
import { RincianSubtes, type BarisSubtes } from "@/components/hasil/RincianSubtes";
import { TombolCetak } from "@/components/hasil/TombolCetak";
import { LayarGagal } from "@/components/exam/LayarGagal";
import { pesanGugur } from "@/components/exam/tipe";
import { tanggalLengkap } from "@/components/hasil/format";
import { requireUser } from "@/lib/auth/auth";
import { one } from "@/lib/core/db";
import {
  ambilHasil,
  detailJawaban,
  hitungHasil,
  posisiPeserta,
  statistikPaket,
} from "@/lib/tryout/irt";
import { rekomendasiKampus, seleksiPilihanPeserta } from "@/lib/rujukan/kampus";
import { URUTAN_SUBTES, getSubtes, namaSubtes } from "@/lib/tryout/snbt";
import { SESI_SKD, URUTAN_SUBTES_SKD } from "@/lib/tryout/skd";
import { HasilSkd } from "@/components/hasil/HasilSkd";
import { ambilHasilSkd, hitungHasilSkd, peringkatSkd } from "@/lib/tryout/nilai-skd";
import { waktuIndo } from "@/lib/core/tampilan";
import { jagaPortal } from "@/lib/admin/portal";

export const metadata = { title: "Hasil Tryout" };

interface AttemptRow {
  id: number;
  user_id: number;
  package_id: number;
  status: string;
  jalur: string;
  kelas: string | null;
  finished_at: string | null;
  digugurkan_at: string | null;
  alasan_gugur: string | null;
  total_skor: number | null;
  paket_nama: string;
  paket_kode: string;
  tampil_pembahasan: number;
  nama_user: string;
  asal_sekolah: string | null;
}

export default async function HalamanHasil({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId: rawId } = await params;
  const attemptId = Number(rawId);
  if (!Number.isFinite(attemptId) || attemptId <= 0) notFound();

  const user = await requireUser();

  const att = await one<AttemptRow>(
    `SELECT att.id, att.user_id, att.package_id, att.status, att.finished_at, att.total_skor,
            att.digugurkan_at, att.alasan_gugur,
            p.nama AS paket_nama, p.kode AS paket_kode, p.tampil_pembahasan, p.jalur,
            u.nama AS nama_user, u.asal_sekolah, u.kelas
       FROM attempts att
       JOIN packages p ON p.id = att.package_id
       JOIN users u ON u.id = att.user_id
      WHERE att.id = ?`,
    attemptId,
  );

  // Hanya pemilik attempt atau admin yang boleh melihat.
  if (!att || (att.user_id !== user.id && user.role !== "admin")) notFound();

  // Portal yang dikunci ikut menutup halaman hasilnya.
  await jagaPortal(att.jalur === "skd" ? "skd" : "utbk");

  // Digugurkan karena pelanggaran: tidak ada hasil untuk ditampilkan.
  if (att.status === "gugur") {
    return (
      <LayarGagal
        pesan={att.alasan_gugur ?? pesanGugur(att.jalur)}
        namaPaket={`${att.paket_nama} · ${att.paket_kode}`}
        waktu={waktuIndo(att.digugurkan_at)}
      />
    );
  }

  if (att.status !== "finished") {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          <EmptyState
            title="Tryout ini belum selesai"
            description="Hasil baru bisa dibuka setelah kamu menuntaskan seluruh subtes."
            action={
              <Link href="/dashboard" className="btn btn-primary">
                Kembali ke Beranda
              </Link>
            }
          />
        </main>
      </>
    );
  }

  // Pembahasan hanya bila admin mengizinkan pada paket ini.
  const urutanTampil = att.jalur === "skd" ? URUTAN_SUBTES_SKD : URUTAN_SUBTES;
  let kelompokPembahasan: KelompokPembahasan[] = [];
  if (att.tampil_pembahasan === 1) {
    const butir = await detailJawaban(attemptId);
    kelompokPembahasan = urutanTampil.map((kode) => ({
      subtes: kode,
      nama: namaSubtes(kode),
      butir: butir
        .filter((b) => b.subtes === kode)
        .map((b) => ({
          id: b.id,
          subtes: b.subtes,
          nomor: b.nomor,
          tipe: b.tipe,
          level: b.level,
          stimulus: b.stimulus,
          pertanyaan: b.pertanyaan,
          gambarUrl: b.gambarUrl,
          opsi: b.opsi,
          kunci: b.kunci,
          pembahasan: b.pembahasan,
          jawaban: b.jawaban,
          benar: b.benar,
          kosong: b.kosong,
          pBenar: b.pBenar,
        })),
    })).filter((k) => k.butir.length > 0);

    // SKD: lebur ketiga subtes jadi satu daftar.
    //
    // Peserta SKD memang tidak pernah tahu sebuah soal masuk TWK, TIU, atau
    // TKP — ruang ujiannya pun menyajikan 110 butir sebagai satu deret utuh —
    // jadi pembahasannya harus setia pada tampilan itu. Nomornya ditulis ulang
    // 1..N mengikuti urutan yang sama dengan ruang ujian (TWK -> TIU -> TKP),
    // karena `questions.nomor` mengulang dari 1 di setiap subtes sehingga
    // penggabungan mentah akan memunculkan nomor kembar.
    if (att.jalur === "skd" && kelompokPembahasan.length > 0) {
      kelompokPembahasan = [
        {
          subtes: SESI_SKD,
          nama: namaSubtes(SESI_SKD),
          butir: kelompokPembahasan
            .flatMap((k) => k.butir)
            .map((b, i) => ({ ...b, nomor: i + 1 })),
        },
      ];
    }
  }

  // ---------- Jalur SKD: poin resmi + passing grade ----------
  //
  // Dicabang SEBELUM penilaian IRT: mesin IRT hanya mengenal subtes UTBK,
  // sehingga attempt SKD yang baris `results`-nya belum ada (atau dihapus
  // admin) dulu berhenti di layar "Hasil belum tersedia" alih-alih dihitung
  // ulang oleh penilai SKD.
  if (att.jalur === "skd") {
    const tersimpan = await ambilHasilSkd(attemptId);
    const adaNilai = tersimpan.perSubtes.some((x) => x.jumlahSoal > 0);
    const hasilSkd = adaNilai ? tersimpan : await hitungHasilSkd(attemptId);

    if (hasilSkd.perSubtes.every((x) => x.jumlahSoal === 0)) {
      return (
        <>
          <Navbar jalur="skd" />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            <EmptyState
              title="Hasil belum tersedia"
              description="Belum ada soal yang tercatat pada paket ini. Hubungi pengajar Adzkia ya."
              action={
                <Link href="/dashboard" className="btn btn-primary">
                  Kembali ke Beranda
                </Link>
              }
            />
          </main>
        </>
      );
    }

    const papan = await peringkatSkd(att.package_id);
    const barisSaya = papan.find((b) => b.attemptId === attemptId) ?? null;

    return (
      <HasilSkd
        hasil={hasilSkd}
        namaPeserta={att.nama_user}
        kelas={att.kelas}
        namaPaket={att.paket_nama}
        kodePaket={att.paket_kode}
        selesaiAt={att.finished_at}
        peringkat={barisSaya?.peringkat ?? null}
        jumlahPeserta={papan.length}
        kelompok={kelompokPembahasan}
        tampilPembahasan={att.tampil_pembahasan === 1}
      />
    );
  }

  // Hasil dihitung ulang otomatis kalau belum pernah tersimpan (idempoten).
  const hasil = await ambilHasil(attemptId) ?? await hitungHasil(attemptId);
  if (hasil.perSubtes.length === 0) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          <EmptyState
            title="Hasil belum tersedia"
            description="Belum ada soal yang tercatat pada paket ini. Hubungi pengajar Adzkia ya."
            action={
              <Link href="/dashboard" className="btn btn-primary">
                Kembali ke Beranda
              </Link>
            }
          />
        </main>
      </>
    );
  }

  const stat = await statistikPaket(att.package_id);
  const posisi = await posisiPeserta(att.package_id, attemptId);
  const rataPer = new Map(stat.perSubtes.map((s) => [s.subtes, s]));

  const baris: BarisSubtes[] = hasil.perSubtes.map((s) => {
    const info = getSubtes(s.subtes);
    const st = rataPer.get(s.subtes);
    return {
      subtes: s.subtes,
      nama: namaSubtes(s.subtes),
      namaPendek: info?.namaPendek ?? s.subtes,
      benar: s.benar,
      salah: s.salah,
      kosong: s.kosong,
      jumlahSoal: s.benar + s.salah + s.kosong,
      skor: Math.round(s.skor),
      theta: s.theta,
      rata: st?.rata ?? Math.round(s.skor),
      tertinggi: st?.tertinggi ?? Math.round(s.skor),
    };
  });

  const totalSkor = Math.round(hasil.totalSkor);

  // Seleksi Pilihan 1-4 dengan aturan SNBT: berurutan, satu peserta satu kursi.
  // Jalur SKD tidak memakai pilihan program studi, jadi daftarnya kosong.
  const seleksiPilihan = await seleksiPilihanPeserta(att.user_id, att.package_id, totalSkor);

  // Rekomendasi kampus dihitung untuk ketiga penyaringan agar bisa dipilih di klien.
  const paketRekomendasi = {
    semua: await rekomendasiKampus(totalSkor),
    saintek: await rekomendasiKampus(totalSkor, "Saintek"),
    soshum: await rekomendasiKampus(totalSkor, "Soshum"),
  };

  return (
    <>
      <GayaCetak />
      <Navbar />

      <main className="cetak-lebar mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <KopCetak
          namaPeserta={att.nama_user}
          asalSekolah={att.asal_sekolah}
          namaPaket={att.paket_nama}
          kodePaket={att.paket_kode}
          dikerjakanAt={att.finished_at}
        />

        {/* Kepala halaman (layar) */}
        <div className="layar-saja mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{att.paket_kode}</Badge>
              {user.role === "admin" && att.user_id !== user.id && (
                <Badge tone="warning">Dilihat sebagai admin</Badge>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">{att.paket_nama}</h1>
            <p className="mt-1 text-sm text-muted">
              {att.nama_user}
              {att.asal_sekolah ? ` · ${att.asal_sekolah}` : ""} · selesai{" "}
              {tanggalLengkap(att.finished_at)}
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Link href="/riwayat" className="btn btn-ghost">
              Riwayat
            </Link>
            <Link href={`/peringkat/${att.package_id}`} className="btn btn-ghost">
              Papan Peringkat
            </Link>
            <TombolCetak />
          </div>
        </div>

        <div className="space-y-5">
          <KartuSkorTotal
            totalSkor={totalSkor}
            peringkat={posisi.peringkat}
            jumlahPeserta={posisi.jumlahPeserta}
            persentil={posisi.persentil}
            rataTotal={stat.rataTotal}
            tertinggiTotal={stat.tertinggiTotal}
          />

          <RincianSubtes baris={baris} />

          <AnalisisSingkat baris={baris} totalSkor={totalSkor} rataTotal={stat.rataTotal} />

          <PilihanProdi hasil={seleksiPilihan} totalSkor={totalSkor} />

          <RekomendasiKampus paket={paketRekomendasi} />

          {att.tampil_pembahasan === 1 ? (
            kelompokPembahasan.length > 0 && <Pembahasan kelompok={kelompokPembahasan} />
          ) : (
            <div className="card p-5 text-sm text-muted">
              Pembahasan untuk paket ini belum dibuka oleh pengajar. Nanti akan muncul di halaman ini
              begitu dibuka ya.
            </div>
          )}
        </div>

        <p className="cetak-saja mt-6 border-t border-line pt-2 text-[10px] text-muted">
          Dicetak dari ADZKIA SMART · pintarbersamaadzkia.com — laporan hasil Tryout Real UTBK-SNBT.
          Rekomendasi kampus bersifat estimasi, bukan angka resmi SNPMB.
        </p>
      </main>
    </>
  );
}
