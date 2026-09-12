import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Alert } from "@/components/ui";
import { LayarGagal } from "@/components/exam/LayarGagal";
import { PilihProdi, type ItemProdi } from "@/components/exam/PilihProdi";
import { PESAN_GUGUR } from "@/components/exam/tipe";
import { requireUser } from "@/lib/auth/auth";
import {
  attemptSiswa,
  getPaket,
  paketDapatDikerjakan,
  paketDapatDikerjakanSusulan,
} from "@/lib/tryout/exam";
import {
  MAKS_PILIHAN,
  MIN_PILIHAN,
  jenjangCocok,
  jumlahKampus,
  jumlahProdi,
  labelJenjangSemua,
  pilihanPeserta,
} from "@/lib/rujukan/prodi";
import { waktuIndo } from "@/lib/core/tampilan";
import { jagaPortal } from "@/lib/admin/portal";
import { simpanJurusanAction } from "../../actions";

export const metadata = { title: "Pilihan Program Studi" };
export const dynamic = "force-dynamic";

/**
 * Langkah pertama sesudah peserta masuk: memilih program studi yang ia incar,
 * maksimal empat, seperti pengisian pilihan SNBT. Pilihan disimpan per paket
 * tryout sehingga perubahan target dari tryout ke tryout ikut terekam.
 */
export default async function PilihJurusanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { e } = await searchParams;

  const packageId = Number(id);
  const paket = await getPaket(packageId);
  if (!paket) notFound();

  // Portal jalur ini ditutup pengelola: siswa tidak boleh masuk lebih jauh.
  await jagaPortal(paket.jalur === "skd" ? "skd" : "utbk");

  // SKD tidak memakai pilihan program studi — langsung ke pemberitahuan.
  if (paket.jalur === "skd") redirect(`/tryout/${packageId}`);

  const jalurBiasa = await paketDapatDikerjakan(paket, user.id);
  const jalurSusulan = await paketDapatDikerjakanSusulan(paket, user.id);
  if (!jalurBiasa && !jalurSusulan) redirect("/dashboard");

  const attempt = await attemptSiswa(user.id, packageId);
  if (attempt?.status === "finished") redirect(`/hasil/${attempt.id}`);
  if (attempt?.status === "gugur" && !jalurSusulan) {
    return (
      <LayarGagal
        pesan={attempt.alasan_gugur ?? PESAN_GUGUR}
        namaPaket={`${paket.nama} · ${paket.kode}`}
        waktu={waktuIndo(attempt.digugurkan_at)}
      />
    );
  }

  const tersimpan = await pilihanPeserta(user.id, packageId);
  // Pilihan lama yang jenjangnya tidak lagi sesuai aturan (Pilihan 1-2 hanya
  // S1, Pilihan 3-4 hanya D3/D4) dikosongkan supaya peserta memilih ulang di
  // sini — bukan ditolak baru saat menekan "Daftar & Lanjut".
  const awal: (ItemProdi | null)[] = Array.from({ length: MAKS_PILIHAN }, (_, i) => {
    const urutan = i + 1;
    const p = tersimpan.find((t) => t.urutan === urutan);
    if (!p || !jenjangCocok(urutan, p.jenjang)) return null;
    return {
      id: p.prodi_id ?? 0,
      nama: p.prodi_nama,
      ptn: p.ptn,
      jenjang: p.jenjang,
      skorMin: p.skor_min,
    };
  });
  const adaYangDikosongkan = tersimpan.some((t) => !jenjangCocok(t.urutan, t.jenjang));

  const mulai = waktuIndo(paket.mulai_at);
  const selesai = waktuIndo(paket.selesai_at);
  const totalProdi = await jumlahProdi();

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">SNBT</p>
        <h1 className="mt-1 text-2xl font-extrabold uppercase leading-tight tracking-tight sm:text-3xl">
          {paket.nama}
        </h1>

        {(mulai || selesai) && (
          <div className="mt-4">
            <h2 className="text-lg font-bold">Periode Tryout:</h2>
            <p className="mt-1 text-sm font-medium">
              <span aria-hidden="true">🗓️</span> {mulai ?? "—"}
              {selesai ? ` – ${selesai}` : ""}
            </p>
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-lg font-bold">Pilihan Program Studi</h2>
          <p className="mt-1 text-sm text-muted">
            Langsung ketik aja ya, cari dan pilih program studi di kampus impian kamu. Pilihan 1 dan
            2 wajib diisi, pilihan 3 dan 4 boleh dikosongkan.
          </p>
          <p className="mt-2 rounded-lg bg-brand-soft px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
            <strong>Aturan jenjang:</strong> Pilihan <strong>1 dan 2</strong> khusus program{" "}
            <strong>Sarjana (S1)</strong>, sedangkan Pilihan <strong>3 dan 4</strong> khusus program{" "}
            <strong>Vokasi (D3 dan D4)</strong>. Kotak pencariannya sudah disaring — yang muncul
            hanya prodi yang boleh dipilih di kotak itu.
          </p>
          <p className="mt-1 text-sm text-muted">
            Angka <span className="font-bold text-brand">±</span> di sebelah nama prodi adalah
            ancar-ancar skor minimum untuk diterima di sana. Angka itu{" "}
            <strong className="text-foreground">perkiraan</strong>, bukan pengumuman resmi SNPMB —
            pakailah sebagai target latihan, bukan janji.
          </p>
          <p className="mt-1 text-xs text-muted">
            Peserta: <strong className="text-foreground">{user.nama}</strong>
          </p>
        </div>

        {e && (
          <div className="mt-5">
            <Alert>{e}</Alert>
          </div>
        )}

        {adaYangDikosongkan && (
          <div className="mt-5">
            <Alert tone="warning">
              Sebagian pilihan yang kamu simpan sebelumnya tidak lagi sesuai aturan jenjang di atas,
              jadi kotaknya dikosongkan. Silakan pilih ulang: Pilihan 1-2 program S1, Pilihan 3-4
              program D3/D4.
            </Alert>
          </div>
        )}

        {totalProdi === 0 ? (
          <div className="mt-6">
            <Alert tone="warning">
              Katalog program studi masih kosong. Pengelola perlu mengunggahnya dulu lewat menu
              Admin → Program Studi.
            </Alert>
          </div>
        ) : (
          <div className="mt-6">
            <PilihProdi
              packageId={packageId}
              maks={MAKS_PILIHAN}
              minWajib={MIN_PILIHAN}
              jenjang={labelJenjangSemua()}
              awal={awal}
              aksi={simpanJurusanAction}
            />
            <p className="mt-4 text-center text-xs text-muted">
              Katalog memuat {totalProdi.toLocaleString("id-ID")} program studi dari{" "}
              {(await jumlahKampus()).toLocaleString("id-ID")} kampus.
            </p>
          </div>
        )}

        <p className="mt-8 text-center">
          <Link href="/dashboard" className="text-sm font-semibold text-muted hover:underline">
            ← Kembali ke Beranda
          </Link>
        </p>
      </main>
    </>
  );
}
