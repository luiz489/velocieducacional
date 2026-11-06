import { cn } from "@/lib/utils";

export function VelociSymbol({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 624 624" role="img" aria-label="Veloci Educacional" className={cn("shrink-0", className)}>
      <rect width="291" height="291" rx="75" fill="#7FD0F0" />
      <rect x="333" width="291" height="291" rx="75" fill="#0E3A5C" />
      <rect y="333" width="291" height="291" rx="75" fill="#F9C384" />
      <g fill="#B8500A" transform="translate(333 333)">
        <path d="M0 40Q63 12 135 48V274Q70 238 0 258Z" />
        <path d="M156 48Q228 12 291 40V258Q221 238 156 274Z" />
      </g>
    </svg>
  );
}
