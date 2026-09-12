import Link from "next/link";

import { ImporPesertaForm } from "@/components/admin/ImporPesertaForm";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/auth";

export const metadata = { title: "Impor Peserta" };
export const dynamic = "force-dynamic";

export default async function ImporPesertaPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Impor Peserta"
        subtitle="Buat akun siswa sekaligus dari daftar NISN. Siswa masuk memakai NISN dan kata sandi yang kamu tetapkan di berkas ini."
        action={
          <Link className="btn btn-ghost" href="/admin/peserta">
            ← Daftar peserta
          </Link>
        }
      />
      <ImporPesertaForm />
    </>
  );
}
