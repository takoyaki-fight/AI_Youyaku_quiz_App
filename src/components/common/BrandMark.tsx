import { cn } from "@/lib/utils";

export const BRAND_MARK_VARIANTS = [
  "book",
  "orbit",
  "monogram",
  "ribbon",
  "lens",
  "steps",
  "beacon",
  "cluster",
  "bridge",
  "trail",
  "prism",
  "quill",
  "helix",
  "forge",
  "seed",
  "rune",
] as const;
export type BrandMarkVariant = (typeof BRAND_MARK_VARIANTS)[number];

export const ACTIVE_BRAND_MARK: BrandMarkVariant = "rune";

interface BrandMarkProps {
  variant?: BrandMarkVariant;
  size?: "sm" | "lg";
  className?: string;
}

const sizeClassMap = {
  sm: "h-9 w-9",
  lg: "h-16 w-16",
} as const;

function BookMark() {
  return (
    <>
      <span className="absolute left-[20%] top-[20%] h-[60%] w-[24%] rounded-l-[20%] rounded-r-[8%] border border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_70%)] bg-[color:var(--md-sys-color-primary-container)]" />
      <span className="absolute right-[20%] top-[20%] h-[60%] w-[24%] rounded-l-[8%] rounded-r-[20%] border border-[color:color-mix(in_srgb,var(--md-sys-color-secondary),transparent_70%)] bg-[color:var(--md-sys-color-secondary-container)]" />
      <span className="absolute left-1/2 top-[22%] h-[56%] w-px -translate-x-1/2 bg-border/80" />
      <span className="absolute right-[24%] top-[25%] h-[14%] w-[14%] rounded-full bg-[color:var(--md-sys-color-tertiary)]" />
    </>
  );
}

function OrbitMark() {
  return (
    <>
      <span className="absolute inset-[18%] rounded-full border border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_65%)]" />
      <span className="absolute inset-[32%] rounded-full bg-[color:var(--md-sys-color-primary-container)]" />
      <span className="absolute left-[16%] top-1/2 h-[14%] w-[14%] -translate-y-1/2 rounded-full bg-[color:var(--md-sys-color-secondary)]" />
      <span className="absolute right-[18%] top-[22%] h-[12%] w-[12%] rounded-full bg-[color:var(--md-sys-color-tertiary)]" />
      <span className="absolute right-[26%] bottom-[18%] h-[10%] w-[10%] rounded-full bg-[color:var(--md-sys-color-primary)]" />
    </>
  );
}

function MonogramMark() {
  return (
    <>
      <span className="absolute inset-[16%] rounded-[24%] bg-[color:var(--md-sys-color-primary-container)]" />
      <span className="absolute left-[30%] top-[24%] h-[52%] w-[8%] rounded-full bg-[color:var(--md-sys-color-on-primary-container)]" />
      <span className="absolute left-[22%] top-[46%] h-[8%] w-[26%] rounded-full bg-[color:var(--md-sys-color-on-primary-container)]" />
      <span className="absolute right-[24%] top-[24%] h-[52%] w-[8%] rounded-full bg-[color:var(--md-sys-color-on-primary-container)]" />
      <span className="absolute right-[24%] top-[24%] h-[8%] w-[18%] rounded-full bg-[color:var(--md-sys-color-on-primary-container)]" />
      <span className="absolute right-[24%] bottom-[24%] h-[8%] w-[18%] rounded-full bg-[color:var(--md-sys-color-on-primary-container)]" />
    </>
  );
}

function RibbonMark() {
  return (
    <>
      <span className="absolute left-[18%] top-[18%] h-[64%] w-[64%] rounded-[26%] border border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_68%)] bg-[color:var(--md-sys-color-primary-container)]" />
      <span className="absolute left-[52%] top-[18%] h-[64%] w-[30%] rounded-r-[24%] rounded-l-[10%] border border-[color:color-mix(in_srgb,var(--md-sys-color-tertiary),transparent_68%)] bg-[color:var(--md-sys-color-tertiary-container)]" />
      <span className="absolute left-[30%] top-[33%] h-[8%] w-[22%] rounded-full bg-[color:var(--md-sys-color-on-primary-container)]/85" />
      <span className="absolute left-[30%] top-[47%] h-[8%] w-[30%] rounded-full bg-[color:var(--md-sys-color-on-primary-container)]/75" />
      <span className="absolute left-[30%] top-[61%] h-[8%] w-[18%] rounded-full bg-[color:var(--md-sys-color-on-primary-container)]/70" />
    </>
  );
}

function LensMark() {
  return (
    <>
      <span className="absolute inset-[16%] rounded-full border border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_60%)] bg-[color:var(--md-sys-color-surface-container-low)]" />
      <span className="absolute inset-[26%] rounded-full border border-[color:color-mix(in_srgb,var(--md-sys-color-secondary),transparent_65%)] bg-[color:var(--md-sys-color-secondary-container)]/70" />
      <span className="absolute inset-[38%] rounded-full bg-[color:var(--md-sys-color-primary)]" />
      <span className="absolute right-[18%] top-[18%] h-[18%] w-[18%] rounded-full bg-[color:var(--md-sys-color-tertiary)]" />
      <span className="absolute left-[18%] bottom-[18%] h-[10%] w-[10%] rounded-full bg-[color:var(--md-sys-color-secondary)]" />
    </>
  );
}

function StepsMark() {
  return (
    <>
      <span className="absolute left-[18%] top-[56%] h-[24%] w-[22%] rounded-[20%] bg-[color:var(--md-sys-color-secondary-container)]" />
      <span className="absolute left-[39%] top-[40%] h-[40%] w-[22%] rounded-[20%] bg-[color:var(--md-sys-color-primary-container)]" />
      <span className="absolute left-[60%] top-[24%] h-[56%] w-[22%] rounded-[20%] bg-[color:var(--md-sys-color-tertiary-container)]" />
      <span className="absolute left-[22%] top-[52%] h-[4%] w-[14%] rounded-full bg-[color:var(--md-sys-color-on-secondary-container)]/75" />
      <span className="absolute left-[43%] top-[36%] h-[4%] w-[14%] rounded-full bg-[color:var(--md-sys-color-on-primary-container)]/75" />
      <span className="absolute left-[64%] top-[20%] h-[4%] w-[14%] rounded-full bg-[color:var(--md-sys-color-on-tertiary-container)]/80" />
    </>
  );
}

function BeaconMark() {
  return (
    <>
      <span className="absolute left-[42%] top-[42%] h-[16%] w-[16%] rounded-full bg-[color:var(--md-sys-color-primary)]" />
      <span className="absolute inset-[24%] rounded-full border border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_62%)]" />
      <span className="absolute inset-[12%] rounded-full border border-[color:color-mix(in_srgb,var(--md-sys-color-secondary),transparent_70%)]" />
      <span className="absolute left-[16%] top-[16%] h-[14%] w-[14%] rounded-full bg-[color:var(--md-sys-color-tertiary)]" />
      <span className="absolute right-[16%] bottom-[16%] h-[12%] w-[12%] rounded-full bg-[color:var(--md-sys-color-secondary)]" />
    </>
  );
}

function ClusterMark() {
  return (
    <>
      <span className="absolute left-[18%] top-[26%] h-[40%] w-[40%] rounded-full border border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_62%)] bg-[color:var(--md-sys-color-primary-container)]" />
      <span className="absolute right-[18%] top-[26%] h-[40%] w-[40%] rounded-full border border-[color:color-mix(in_srgb,var(--md-sys-color-secondary),transparent_62%)] bg-[color:var(--md-sys-color-secondary-container)]" />
      <span className="absolute left-[30%] bottom-[16%] h-[40%] w-[40%] rounded-full border border-[color:color-mix(in_srgb,var(--md-sys-color-tertiary),transparent_62%)] bg-[color:var(--md-sys-color-tertiary-container)]" />
      <span className="absolute left-[44%] top-[42%] h-[12%] w-[12%] rounded-full bg-[color:var(--md-sys-color-on-primary-container)]" />
    </>
  );
}

function BridgeMark() {
  return (
    <>
      <span className="absolute left-[18%] top-[62%] h-[8%] w-[64%] rounded-full bg-[color:var(--md-sys-color-outline)]/70" />
      <span className="absolute left-[22%] top-[26%] h-[36%] w-[12%] rounded-[20%] bg-[color:var(--md-sys-color-primary-container)]" />
      <span className="absolute right-[22%] top-[26%] h-[36%] w-[12%] rounded-[20%] bg-[color:var(--md-sys-color-secondary-container)]" />
      <span className="absolute left-[30%] top-[22%] h-[34%] w-[40%] rounded-t-[100%] border-x border-t border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_55%)]" />
      <span className="absolute left-[47%] top-[42%] h-[20%] w-[6%] rounded-full bg-[color:var(--md-sys-color-tertiary)]" />
    </>
  );
}

function TrailMark() {
  return (
    <>
      <span className="absolute left-[18%] top-[64%] h-[12%] w-[18%] rounded-full bg-[color:var(--md-sys-color-secondary)]" />
      <span className="absolute left-[36%] top-[50%] h-[12%] w-[18%] rounded-full bg-[color:var(--md-sys-color-secondary-container)]" />
      <span className="absolute left-[54%] top-[36%] h-[12%] w-[18%] rounded-full bg-[color:var(--md-sys-color-primary-container)]" />
      <span className="absolute right-[14%] top-[20%] h-[18%] w-[18%] rounded-full bg-[color:var(--md-sys-color-primary)]" />
      <span className="absolute left-[26%] top-[58%] h-[4%] w-[44%] rotate-[-24deg] rounded-full bg-[color:color-mix(in_srgb,var(--md-sys-color-outline),transparent_25%)]" />
    </>
  );
}

function PrismMark() {
  return (
    <>
      <span className="absolute left-[22%] top-[20%] h-0 w-0 border-l-[14px] border-r-[14px] border-b-[26px] border-l-transparent border-r-transparent border-b-[color:var(--md-sys-color-primary-container)]" />
      <span className="absolute left-[36%] top-[36%] h-0 w-0 border-l-[14px] border-r-[14px] border-b-[26px] border-l-transparent border-r-transparent border-b-[color:var(--md-sys-color-secondary-container)]" />
      <span className="absolute left-[50%] top-[20%] h-0 w-0 border-l-[14px] border-r-[14px] border-b-[26px] border-l-transparent border-r-transparent border-b-[color:var(--md-sys-color-tertiary-container)]" />
      <span className="absolute left-[42%] top-[62%] h-[10%] w-[16%] rounded-full bg-[color:var(--md-sys-color-primary)]" />
    </>
  );
}

function QuillMark() {
  return (
    <>
      <span className="absolute left-[28%] top-[18%] h-[56%] w-[44%] -rotate-[18deg] rounded-[80%_20%_70%_30%/70%_30%_70%_30%] border border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_62%)] bg-[color:var(--md-sys-color-primary-container)]" />
      <span className="absolute left-[44%] top-[32%] h-[34%] w-[6%] rotate-[18deg] rounded-full bg-[color:var(--md-sys-color-on-primary-container)]/75" />
      <span className="absolute left-[46%] top-[64%] h-[20%] w-[6%] rotate-[32deg] rounded-full bg-[color:var(--md-sys-color-secondary)]" />
      <span className="absolute left-[52%] top-[72%] h-[6%] w-[22%] rotate-[10deg] rounded-full bg-[color:var(--md-sys-color-tertiary)]" />
    </>
  );
}

function HelixMark() {
  return (
    <>
      <span className="absolute left-[22%] top-[20%] h-[60%] w-[16%] rounded-full border border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_60%)] bg-[color:var(--md-sys-color-primary-container)]" />
      <span className="absolute left-[42%] top-[20%] h-[60%] w-[16%] rounded-full border border-[color:color-mix(in_srgb,var(--md-sys-color-secondary),transparent_60%)] bg-[color:var(--md-sys-color-secondary-container)]" />
      <span className="absolute left-[62%] top-[20%] h-[60%] w-[16%] rounded-full border border-[color:color-mix(in_srgb,var(--md-sys-color-tertiary),transparent_60%)] bg-[color:var(--md-sys-color-tertiary-container)]" />
      <span className="absolute left-[28%] top-[30%] h-[4%] w-[46%] rounded-full bg-[color:var(--md-sys-color-outline)]/65" />
      <span className="absolute left-[28%] top-[48%] h-[4%] w-[46%] rounded-full bg-[color:var(--md-sys-color-outline)]/65" />
      <span className="absolute left-[28%] top-[66%] h-[4%] w-[46%] rounded-full bg-[color:var(--md-sys-color-outline)]/65" />
    </>
  );
}

function ForgeMark() {
  return (
    <>
      <span className="absolute left-[18%] top-[58%] h-[18%] w-[64%] rounded-[28%] bg-[color:var(--md-sys-color-secondary-container)]" />
      <span className="absolute left-[26%] top-[34%] h-[26%] w-[48%] rounded-t-[55%] rounded-b-[28%] bg-[color:var(--md-sys-color-primary-container)]" />
      <span className="absolute left-[42%] top-[22%] h-[22%] w-[16%] rounded-[60%_60%_80%_80%] bg-[color:var(--md-sys-color-tertiary)]" />
      <span className="absolute left-[48%] top-[30%] h-[16%] w-[6%] rounded-full bg-[color:var(--md-sys-color-on-primary-container)]/75" />
      <span className="absolute left-[24%] top-[70%] h-[4%] w-[52%] rounded-full bg-[color:var(--md-sys-color-on-secondary-container)]/70" />
    </>
  );
}

function SeedMark() {
  return (
    <>
      <span className="absolute left-[28%] top-[24%] h-[42%] w-[24%] -rotate-[18deg] rounded-[65%_35%_60%_40%] bg-[color:var(--md-sys-color-primary-container)]" />
      <span className="absolute left-[50%] top-[24%] h-[42%] w-[24%] rotate-[18deg] rounded-[35%_65%_40%_60%] bg-[color:var(--md-sys-color-secondary-container)]" />
      <span className="absolute left-[47%] top-[54%] h-[22%] w-[6%] rounded-full bg-[color:var(--md-sys-color-tertiary)]" />
      <span className="absolute left-[34%] top-[72%] h-[4%] w-[32%] rounded-full bg-[color:var(--md-sys-color-outline)]/75" />
    </>
  );
}

function RuneMark() {
  return (
    <>
      <span className="absolute inset-[16%] rounded-[24%] border border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_60%)] bg-[color:var(--md-sys-color-surface-container-low)]" />
      <span className="absolute left-[28%] top-[24%] h-[52%] w-[8%] rounded-full bg-[color:var(--md-sys-color-primary)]" />
      <span className="absolute left-[28%] top-[24%] h-[8%] w-[28%] rounded-full bg-[color:var(--md-sys-color-secondary)]" />
      <span className="absolute left-[42%] top-[40%] h-[8%] w-[20%] rounded-full bg-[color:var(--md-sys-color-tertiary)]" />
      <span className="absolute left-[42%] top-[56%] h-[8%] w-[28%] rounded-full bg-[color:var(--md-sys-color-secondary)]" />
      <span className="absolute right-[24%] top-[24%] h-[52%] w-[8%] rounded-full bg-[color:var(--md-sys-color-primary)]/75" />
    </>
  );
}

export function BrandMark({
  variant = ACTIVE_BRAND_MARK,
  size = "sm",
  className,
}: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-block rounded-[12px] border border-border/70 bg-[color:var(--md-sys-color-surface-container-high)] shadow-[var(--md-elevation-1)]",
        sizeClassMap[size],
        className
      )}
    >
      {variant === "book" ? <BookMark /> : null}
      {variant === "orbit" ? <OrbitMark /> : null}
      {variant === "monogram" ? <MonogramMark /> : null}
      {variant === "ribbon" ? <RibbonMark /> : null}
      {variant === "lens" ? <LensMark /> : null}
      {variant === "steps" ? <StepsMark /> : null}
      {variant === "beacon" ? <BeaconMark /> : null}
      {variant === "cluster" ? <ClusterMark /> : null}
      {variant === "bridge" ? <BridgeMark /> : null}
      {variant === "trail" ? <TrailMark /> : null}
      {variant === "prism" ? <PrismMark /> : null}
      {variant === "quill" ? <QuillMark /> : null}
      {variant === "helix" ? <HelixMark /> : null}
      {variant === "forge" ? <ForgeMark /> : null}
      {variant === "seed" ? <SeedMark /> : null}
      {variant === "rune" ? <RuneMark /> : null}
    </span>
  );
}
