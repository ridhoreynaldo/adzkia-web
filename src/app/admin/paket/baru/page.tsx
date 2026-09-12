import Link from "next/link";

import { PaketForm } from "@/components/admin/PaketForm";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/auth";

export const metadata = { title: "Paket Baru" };

export default async function PaketBaruPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Buat paket tryout"
        subtitle="Isi identitas paket dulu; bank soalnya bisa dilengkapi setelah paket tersimpan."
        action={
          <Link className="btn btn-ghost" href="/admin/paket">
            ← Daftar paket
          </Link>
        }
      />
      <div className="max-w-3xl">
        <PaketForm />
      </div>
    </>
  );
}
