import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/common/BrandMark";

interface BrandLogoProps {
  size?: "sm" | "lg";
  className?: string;
  showTagline?: boolean;
  hideWordmarkOnMobile?: boolean;
}

export function BrandLogo({
  size = "sm",
  className,
  showTagline = false,
  hideWordmarkOnMobile = false,
}: BrandLogoProps) {
  const isLarge = size === "lg";
  const markSize = isLarge ? "lg" : "sm";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5",
        isLarge && "flex-col gap-3 text-center",
        className
      )}
    >
      <BrandMark size={markSize} />
      <div
        className={cn(
          "leading-none",
          isLarge && "text-center",
          hideWordmarkOnMobile && "hidden sm:block"
        )}
      >
        <p
          className={cn(
            "bg-[linear-gradient(120deg,var(--md-sys-color-primary),var(--md-sys-color-secondary),var(--md-sys-color-tertiary))] bg-clip-text text-transparent",
            isLarge
              ? "text-3xl font-semibold tracking-[0.08em]"
              : "text-sm font-semibold tracking-[0.1em]"
          )}
        >
          MAIEUTICS
        </p>
        {showTagline ? (
          <p className="mt-1 text-xs tracking-[0.08em] text-[color:var(--md-sys-color-on-surface-variant)]">
            問いで理解を引き出す
          </p>
        ) : null}
      </div>
    </div>
  );
}
