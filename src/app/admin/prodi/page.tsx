import { KartuStat } from "@/components/admin/AdminUI";
import { ImporProdiForm } from "@/components/admin/ImporProdiForm";
import { Alert, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/auth";
import { cariProdi, jumlahKampus, jumlahProdi, jumlahProdiPerJenjang } from "@/lib/rujukan/prodi";

export const metadata = { title: "Program Studi" };
export const dynamic = "force-dynamic";

export default async function ProdiPage() {
  await requireAdmin();

  const total = await jumlahProdi();
  const kampus = await jumlahKampus();
  const contoh = await cariProdi("universitas", 5);

  // Sejak Pilihan 1-2 dikunci ke S1 dan Pilihan 3-4 ke D3/D4, kolom "jenjang"
  // di katalog menentukan apa yang bisa dipilih peserta. Berkas impor yang
  // tidak memuat kolom itu akan membuat kotak pilihan kosong melompong, jadi
  // jumlah per jenjang ditampilkan di sini sebagai penjaga.
  const perJenjang = await jumlahProdiPerJenjang();
  const cari = (j: string) => perJenjang.find((p) => p.jenjang === j)?.n ?? 0;
  const nS1 = cari("S1");
  const nVokasi = cari("D3") + cari("D4");
  const nTanpaJenjang = cari("—");

  return (
    <>
      <PageHeader
        title="Program Studi"
        subtitle="Katalog yang muncul di kotak pencarian 'Pilihan Program Studi' sebelum peserta memulai tryout."
      />

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <KartuStat
          label="Program studi"
          nilai={total.toLocaleString("id-ID")}
          keterangan="Bisa dicari peserta"
        />
        <KartuStat
          label="Kampus"
          nilai={kampus.toLocaleString("id-ID")}
          keterangan="PTN, politeknik, dan institut"
        />
        <KartuStat
          label="Contoh hasil cari"
          nilai={contoh.length}
          keterangan={contoh[0] ? `${contoh[0].nama} — ${contoh[0].ptn}` : "Katalog masih kosong"}
        />
      </section>

      <section className="mb-8">
        <p className="text-sm text-muted">
          Peserta mengisi <strong className="text-foreground">Pilihan 1 dan 2 dengan S1</strong>,
          lalu <strong className="text-foreground">Pilihan 3 dan 4 dengan D3/D4</strong>. Isi
          katalog menurut jenjangnya:{" "}
          {perJenjang
            .filter((p) => p.n > 0)
            .map((p) => `${p.jenjang} ${p.n.toLocaleString("id-ID")}`)
            .join(" · ") || "belum ada"}
          .
        </p>

        {total > 0 && (nS1 === 0 || nVokasi === 0) && (
          <div className="mt-3">
            <Alert tone="warning">
              Katalog belum punya prodi {nS1 === 0 ? "S1" : "D3/D4"}, sehingga{" "}
              {nS1 === 0 ? "Pilihan 1 dan 2" : "Pilihan 3 dan 4"} tidak akan menemukan apa pun saat
              dicari peserta. Pastikan berkas impor memuat kolom{" "}
              <strong>jenjang</strong> (S1, D3, D4).
            </Alert>
          </div>
        )}

        {nTanpaJenjang > 0 && (
          <p className="mt-3 text-sm text-muted">
            {nTanpaJenjang.toLocaleString("id-ID")} prodi tidak punya jenjang yang dikenali dan
            tidak akan muncul di kotak pilihan peserta.
          </p>
        )}
      </section>

      <ImporProdiForm />
    </>
  );
}
