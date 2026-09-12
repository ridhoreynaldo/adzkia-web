import { redirect } from "next/navigation";

import { HalamanUjian } from "@/components/language/HalamanUjian";
import { getSession } from "@/lib/auth/auth";
import { wajibFiturLanguage } from "@/lib/ielts/language";

export const metadata = { title: "TOEFL — Language Skill" };
export const dynamic = "force-dynamic";

export default async function ToeflPage() {
  await wajibFiturLanguage();
  if (!(await getSession())) redirect("/language/login?next=%2Flanguage%2Ftoefl");
  return <HalamanUjian kode="toefl" />;
}
