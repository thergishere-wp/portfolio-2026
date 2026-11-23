import type { ReactNode } from "react";
import type { ChipIconName } from "@/content/about";

const SHAPES: Record<ChipIconName, ReactNode> = {
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  cap: (
    <>
      <path d="M3 9l9-5 9 5-9 5-9-5Z" />
      <path d="M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5" />
    </>
  ),
  code: <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />,
};

export function ChipIcon({ name }: { name: ChipIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      {SHAPES[name]}
    </svg>
  );
}
