import Image from "next/image";
import { cn } from "@/utils/cn";

type ProductVisualProps = {
  title: string;
  subtitle?: string;
  palette: string;
  className?: string;
  showText?: boolean;
};

export function ProductVisual({
  title,
  subtitle,
  palette,
  className,
  showText,
}: ProductVisualProps) {
  const hasImage = /^(https?:\/\/|\/)/.test(palette);
  const shouldShowText = showText ?? !hasImage;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border",
        hasImage ? "border-brand-100 bg-brand-50" : "border-white/80 bg-gradient-to-br",
        !hasImage && palette,
        shouldShowText ? "p-5" : "p-0",
        className,
      )}
    >
      {hasImage ? (
        <>
          <Image
            src={palette}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
          {shouldShowText ? (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          ) : null}
        </>
      ) : (
        <>
          <div className="absolute -right-8 top-4 h-28 w-28 rounded-full bg-white/40 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-white/30 blur-2xl" />
        </>
      )}

      {shouldShowText ? (
        <div className="relative flex h-full flex-col justify-end">
          <div>
            <p className={cn("font-serif text-2xl font-bold", hasImage ? "text-white" : "text-ink-900")}>
              {title}
            </p>
            {subtitle ? (
              <p className={cn("mt-2 text-sm", hasImage ? "text-white/90" : "text-ink-600")}>
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
 