import React from "react";

type Props = React.SVGProps<SVGSVGElement>;

export function CatSitting(props: Props) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M14 8 L22 26 L28 20 Z" />
      <path d="M50 8 L42 26 L36 20 Z" />
      <ellipse cx="32" cy="26" rx="16" ry="14" />
      <ellipse cx="32" cy="50" rx="22" ry="12" />
      <circle cx="40" cy="58" r="3" fill="currentColor" />
      <circle cx="24" cy="58" r="3" fill="currentColor" />
      <path d="M52 50 Q62 42 56 26" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function CatWalking(props: Props) {
  return (
    <svg viewBox="0 0 96 64" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M6 10 L14 28 L22 22 Z" />
      <path d="M30 10 L28 28 L20 22 Z" />
      <ellipse cx="18" cy="32" rx="14" ry="12" />
      <rect x="20" y="34" width="50" height="20" rx="10" />
      <rect x="26" y="48" width="6" height="14" rx="2" />
      <rect x="60" y="48" width="6" height="14" rx="2" />
      <path d="M72 38 Q92 30 86 8" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function CatCurled(props: Props) {
  return (
    <svg viewBox="0 0 80 56" fill="currentColor" aria-hidden="true" {...props}>
      <ellipse cx="40" cy="36" rx="36" ry="18" />
      <ellipse cx="14" cy="30" rx="10" ry="9" />
      <path d="M6 22 L10 12 L18 24 Z" />
      <path d="M22 22 L18 12 L12 24 Z" />
      <path d="M68 38 Q80 32 72 22 Q66 32 60 32" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function CatFace(props: Props) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8 4 L18 28 L26 18 Z" />
      <path d="M56 4 L46 28 L38 18 Z" />
      <ellipse cx="32" cy="32" rx="24" ry="22" />
      <ellipse cx="22" cy="30" rx="3" ry="4" fill="#fff" />
      <ellipse cx="42" cy="30" rx="3" ry="4" fill="#fff" />
      <circle cx="22" cy="31" r="1.5" fill="#1f1014" />
      <circle cx="42" cy="31" r="1.5" fill="#1f1014" />
      <path d="M32 40 L28 44 M32 40 L36 44" stroke="#1f1014" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M28 44 Q32 48 36 44" stroke="#1f1014" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M14 32 L4 30 M14 36 L4 38 M50 32 L60 30 M50 36 L60 38" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function CatPaw(props: Props) {
  return (
    <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true" {...props}>
      <ellipse cx="24" cy="34" rx="11" ry="9" />
      <circle cx="10" cy="20" r="5" />
      <circle cx="38" cy="20" r="5" />
      <circle cx="18" cy="10" r="4" />
      <circle cx="30" cy="10" r="4" />
    </svg>
  );
}

export function BackgroundCats() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden text-rose-300/70 dark:text-rose-400/10"
    >
      <CatSitting className="absolute top-24 -left-6 h-40 w-40 opacity-30 rotate-[-8deg] sm:h-56 sm:w-56" />
      <CatWalking className="absolute top-1/3 -right-10 h-32 w-48 opacity-25 rotate-[6deg] sm:h-48 sm:w-72" />
      <CatCurled className="absolute bottom-32 left-4 h-28 w-40 opacity-25 rotate-[-12deg] sm:h-40 sm:w-56" />
      <CatPaw className="absolute top-10 right-8 h-14 w-14 opacity-30 rotate-[15deg]" />
      <CatPaw className="absolute bottom-20 right-1/4 h-10 w-10 opacity-25 rotate-[-20deg]" />
      <CatFace className="absolute top-2/3 left-1/2 h-24 w-24 -translate-x-1/2 opacity-15 rotate-[8deg]" />
    </div>
  );
}
