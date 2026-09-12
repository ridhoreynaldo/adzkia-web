import { getSession } from "@/lib/auth/auth";
import { balasanTerlaluSering, hitungLaju } from "@/lib/core/laju";
import { getAttempt, simpanJawabanBanyak } from "@/lib/tryout/exam";
import type { BodiSimpanJawaban, ItemJawaban } from "@/components/exam/tipe";

export const dynamic = "force-dynamic";

function normalkanItem(v: unknown): ItemJawaban | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const questionId = Number(o.questionId ?? o.question_id);
  if (!Number.isInteger(questionId) || questionId <= 0) return null;

  const mentah = o.jawaban ?? o.nilai ?? null;
  let jawaban: string | null = null;
  if (typeof mentah === "string") jawaban = mentah;
  else if (Array.isArray(mentah)) jawaban = JSON.stringify(mentah.map((x) => String(x)));
  else if (typeof mentah === "number") jawaban = String(mentah);

  if (jawaban !== null && jawaban.length > 5000) jawaban = jawaban.slice(0, 5000);
  if (jawaban !== null && jawaban.trim() === "") jawaban = null;

  return { questionId, jawaban, ragu: o.ragu === true || o.ragu === 1 };
}

/** Autosave jawaban peserta. Menerima satu butir atau sekumpulan butir. */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) {
    return Response.json({ ok: false, pesan: "Sesi berakhir. Silakan masuk lagi." }, { status: 401 });
  }

  // 120/menit — jauh di atas laju mengetik tercepat sekalipun. Autosave yang
  // sah tidak akan pernah tersentuh; klien yang mengulang tanpa henti akan.
  const laju = await hitungLaju("jawaban", user.id);
  if (!laju.boleh) return balasanTerlaluSering(laju);

  let body: BodiSimpanJawaban;
  try {
    body = (await request.json()) as BodiSimpanJawaban;
  } catch {
    return Response.json({ ok: false, pesan: "Format permintaan tidak valid." }, { status: 400 });
  }

  const attemptId = Number(body?.attemptId);
  const att = await getAttempt(attemptId);
  if (!att || att.user_id !== user.id) {
    return Response.json({ ok: false, pesan: "Sesi ujian tidak ditemukan." }, { status: 404 });
  }
  if (att.status !== "ongoing") {
    return Response.json({ ok: false, pesan: "Ujian sudah selesai." }, { status: 409 });
  }

  const mentah: unknown[] = Array.isArray(body.jawaban)
    ? body.jawaban
    : [{ questionId: body.questionId, jawaban: body.nilai, ragu: body.ragu }];

  const items = mentah.map(normalkanItem).filter((x): x is ItemJawaban => x !== null);
  if (items.length === 0) {
    return Response.json({ ok: false, pesan: "Tidak ada jawaban untuk disimpan." }, { status: 400 });
  }

  // Tiga query, berapa pun banyak butir yang dikirim. Perulangan sebelumnya
  // membayar empat query per butir dan mengerjakannya berurutan — 643 query
  // untuk kiriman 160 butir di akhir ujian, justru pada saat seluruh peserta
  // mengirim berbarengan. Aturan penerimaannya tidak berubah sedikit pun;
  // lihat `simpanJawabanBanyak()`.
  const { tersimpan, ditolak } = await simpanJawabanBanyak(att, items);

  if (tersimpan === 0) {
    return Response.json(
      { ok: false, pesan: "Waktu subtes ini sudah habis.", ditolak },
      { status: 409 },
    );
  }

  return Response.json({ ok: true, tersimpan, ditolak, waktu: new Date().toISOString() });
}
