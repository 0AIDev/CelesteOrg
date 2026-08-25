import { initials, cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const sizeMap: Record<Size, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-sm",
  xl: "h-20 w-20 text-2xl",
};

interface Props {
  name?: string | null;
  src?: string | null;
  size?: Size;
  className?: string;
}

// Circular avatar. Without a photo it renders initials on a black tile
// (monochrome, matching the design system); with a photo the image is shown.
export function SquircleAvatar({ name, src, size = "md", className }: Props) {
  return (
    <div
      className={cn(
        "select-none shrink-0 overflow-hidden rounded-full bg-gray-900 text-white flex items-center justify-center font-semibold",
        sizeMap[size],
        className,
      )}
      aria-label={name ?? "avatar"}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        // Using plain img (not next/image) so arbitrary avatar URLs work offline.
        <img src={src} alt={name ?? ""} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}
