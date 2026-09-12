/**
 * Ikon garis untuk panel IELTS.
 *
 * Digambar sebaris sebagai SVG, bukan emoji, dengan alasan yang sama seperti
 * [BenderaDunia]: emoji dirupakan berbeda-beda oleh tiap sistem, dan panel yang
 * dibuka dari Windows sekolah harus terlihat sama dengan yang dibuka dari mana
 * pun. Semuanya `currentColor`, jadi warnanya ikut kartu yang memuatnya.
 *
 * Empat ikon pertama sepadan dengan keempat subtes IELTS dan dipakai berulang
 * di daftar paket; sisanya untuk menu panel.
 */

type Props = { className?: string };

function Bungkus({ className = "h-5 w-5", children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`shrink-0 ${className}`}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/* ---------- Subtes ---------- */

/** Listening — kepala dengan sepasang pendengar. */
export function IkonListening(p: Props) {
  return (
    <Bungkus {...p}>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="2.5" y="13" width="4" height="7" rx="1.6" />
      <rect x="17.5" y="13" width="4" height="7" rx="1.6" />
    </Bungkus>
  );
}

/** Reading — buku terbuka. */
export function IkonReading(p: Props) {
  return (
    <Bungkus {...p}>
      <path d="M12 6.5S9.5 4.8 4 4.8v13C9.5 17.8 12 19.5 12 19.5s2.5-1.7 8-1.7v-13C14.5 4.8 12 6.5 12 6.5Z" />
      <path d="M12 6.5v13" />
    </Bungkus>
  );
}

/** Writing — pena di atas garis. */
export function IkonWriting(p: Props) {
  return (
    <Bungkus {...p}>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4Z" />
      <path d="M4 21h16" />
    </Bungkus>
  );
}

/** Speaking — mikrofon. */
export function IkonSpeaking(p: Props) {
  return (
    <Bungkus {...p}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21M9 21h6" />
    </Bungkus>
  );
}

/* ---------- Menu panel ---------- */

/** Skor Live — grafik berdenyut. */
export function IkonLive(p: Props) {
  return (
    <Bungkus {...p}>
      <path d="M3 12h3.5l2-5 3 10 2.5-5H21" />
    </Bungkus>
  );
}

/** Keamanan Ujian — perisai. */
export function IkonPerisai(p: Props) {
  return (
    <Bungkus {...p}>
      <path d="M12 2.8 20 6v6c0 4.6-3.2 7.9-8 9.2-4.8-1.3-8-4.6-8-9.2V6Z" />
      <path d="m9 12 2 2 4-4" />
    </Bungkus>
  );
}

/** Peserta — dua orang. */
export function IkonPeserta(p: Props) {
  return (
    <Bungkus {...p}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.6M17 14.4A6.2 6.2 0 0 1 21.2 20" />
    </Bungkus>
  );
}

/** Papan band — podium peringkat. */
export function IkonPapan(p: Props) {
  return (
    <Bungkus {...p}>
      <rect x="9" y="4" width="6" height="16" rx="1" />
      <rect x="2.5" y="10" width="6" height="10" rx="1" />
      <rect x="15.5" y="8" width="6" height="12" rx="1" />
    </Bungkus>
  );
}

/** Kunci portal — gembok. */
export function IkonGembok(p: Props) {
  return (
    <Bungkus {...p}>
      <rect x="4" y="10" width="16" height="11" rx="2.4" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Bungkus>
  );
}

/** Pembahasan — lembar bertanda centang. */
export function IkonPembahasan(p: Props) {
  return (
    <Bungkus {...p}>
      <path d="M6 2.8h8l4 4V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1Z" />
      <path d="M14 2.8v4h4" />
      <path d="m8.5 14.5 2 2 4-4.5" />
    </Bungkus>
  );
}

/** Paket soal — tumpukan kotak. */
export function IkonPaket(p: Props) {
  return (
    <Bungkus {...p}>
      <path d="M12 2.8 21 7v10l-9 4.2L3 17V7Z" />
      <path d="M3 7l9 4.2L21 7M12 11.2V21.2" />
    </Bungkus>
  );
}

/** Bola dunia — lambang jalur IELTS. */
export function IkonGlobe(p: Props) {
  return (
    <Bungkus {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8M3.6 15h16.8" />
      <path d="M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" />
    </Bungkus>
  );
}

/** Ikon subtes menurut kodenya — dipakai daftar paket. */
export function IkonSubtes({ kode, className }: { kode: string; className?: string }) {
  if (kode === "LISTENING") return <IkonListening className={className} />;
  if (kode === "READING") return <IkonReading className={className} />;
  if (kode === "WRITING") return <IkonWriting className={className} />;
  if (kode === "SPEAKING") return <IkonSpeaking className={className} />;
  return <IkonPaket className={className} />;
}
