import { cn } from "@/lib/utils";

const colorMap = {
  c1: "bg-gradient-to-br from-[#1dc6ee] to-[#0f9ec7]",
  c2: "bg-gradient-to-br from-[#5ecb2e] to-[#3a9417]",
  c3: "bg-gradient-to-br from-[#ff8c3a] to-[#d45d10]",
  c4: "bg-gradient-to-br from-[#9a7af0] to-[#6a50d8]",
  c5: "bg-gradient-to-br from-[#f0607a] to-[#d43860]",
} as const;

const sizeMap = {
  sm: "size-8 text-[11px]",
  md: "size-11 text-sm",
  lg: "size-14 text-[17px]",
  xl: "size-[88px] text-[28px]",
} as const;

export type FaceColor = keyof typeof colorMap;
export type FaceSize = keyof typeof sizeMap;

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function colorFromString(s: string): FaceColor {
  const colors: FaceColor[] = ["c1", "c2", "c3", "c4", "c5"];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) % colors.length;
  return colors[h];
}

type FaceAvatarProps = {
  name: string;
  size?: FaceSize;
  color?: FaceColor;
  className?: string;
};

export function FaceAvatar({
  name,
  size = "md",
  color,
  className,
}: FaceAvatarProps) {
  const c = color ?? colorFromString(name);
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full font-bold text-white shadow-md ring-2 ring-white",
        sizeMap[size],
        colorMap[c],
        className,
      )}
      aria-hidden
    >
      {initialsFromName(name)}
    </div>
  );
}
