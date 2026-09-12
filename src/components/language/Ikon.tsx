/**
 * Lambang LANGUAGE SKILL: bola dunia dengan garis bujur — sama seperti ikon
 * Warung Soal, digambar sebagai SVG sebaris supaya warnanya bisa ikut tombol
 * dan bentuknya tetap tajam di layar mana pun.
 */
export function IkonLanguage({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`shrink-0 ${className}`}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8M3.6 15h16.8" />
      <path d="M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" />
    </svg>
  );
}
