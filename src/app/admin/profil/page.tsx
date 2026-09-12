import { ProfilNamaForm } from "@/components/admin/ProfilNamaForm";
import { PageHeader } from "@/components/ui";
import { requireAdminIelts } from "@/lib/auth/auth";

export const metadata = { title: "Profil Admin" };
export const dynamic = "force-dynamic";

/**
 * Profil pengelola yang sedang masuk.
 *
 * Untuk sekarang isinya satu hal saja: mengganti nama tampilan. Email tidak
 * bisa diubah dari sini karena itulah kunci masuk panel admin — menggantinya
 * sambil lalu berisiko mengunci pengelola dari aplikasinya sendiri.
 */
export default async function HalamanProfilAdmin() {
  // Halaman ini sengaja terbuka bagi pengelola berlingkup IELTS juga: isinya
  // hanya akun MILIKNYA SENDIRI, dan mengunci seseorang dari namanya sendiri
  // tidak melindungi apa pun.
  const admin = await requireAdminIelts();

  return (
    <>
      <PageHeader
        title="Profil saya"
        subtitle="Keterangan akun pengelola yang sedang dipakai di peramban ini."
      />

      <div className="grid gap-6 lg:grid-cols-[26rem_1fr]">
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide">Ganti nama</h2>
          <ProfilNamaForm namaSekarang={admin.nama} />
        </section>

        <section className="card h-fit p-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide">Keterangan akun</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Email</dt>
              <dd className="mt-0.5 font-semibold">{admin.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Peran</dt>
              <dd className="mt-0.5 font-semibold">
                {admin.lingkup === "ielts"
                  ? "Admin IELTS — hanya panel IELTS"
                  : "Admin — akses penuh panel pengelola"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Mau mengganti email atau kata sandi? Keduanya belum bisa diubah dari sini. Buat akun
            admin baru lewat Peserta &rarr; naikkan perannya, lalu turunkan akun lama, atau minta
            bantuan pengembang.
          </p>
        </section>
      </div>
    </>
  );
}
