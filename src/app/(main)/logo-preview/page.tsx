import {
  ACTIVE_BRAND_MARK,
  BRAND_MARK_VARIANTS,
  BrandMark,
} from "@/components/common/BrandMark";

function surfaceClass(index: number) {
  if (index === 0) return "bg-[color:var(--md-sys-color-surface)]";
  if (index === 1) return "bg-[color:var(--md-sys-color-surface-container)]";
  return "bg-[color:var(--md-sys-color-inverse-surface)]";
}

function labelClass(index: number) {
  if (index === 2) return "text-[color:var(--md-sys-color-inverse-on-surface)]";
  return "text-[color:var(--md-sys-color-on-surface-variant)]";
}

export default function LogoPreviewPage() {
  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <header className="mb-6 rounded-[var(--md-shape-lg)] border border-border/70 bg-card p-5 shadow-[var(--md-elevation-1)]">
        <h1 className="text-xl font-semibold text-foreground">Logo Preview</h1>
        <p className="mt-1 text-sm text-[color:var(--md-sys-color-on-surface-variant)]">
          ここでロゴ候補を比較できます。現在の適用案は
          {" "}
          <code className="rounded bg-[color:var(--md-sys-color-surface-container)] px-1.5 py-0.5 text-xs">
            {ACTIVE_BRAND_MARK}
          </code>
          です。
        </p>
        <p className="mt-2 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
          `src/components/common/BrandMark.tsx`
          {" "}
          の
          {" "}
          <code>ACTIVE_BRAND_MARK</code>
          {" "}
          を変更すると、全画面に同じロゴが反映されます。
          {" "}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {BRAND_MARK_VARIANTS.map((variant) => {
          const isActive = variant === ACTIVE_BRAND_MARK;
          return (
            <section
              key={variant}
              className={`rounded-[var(--md-shape-lg)] border p-4 shadow-[var(--md-elevation-1)] ${
                isActive
                  ? "border-primary/40 bg-[color:var(--md-sys-color-primary-container)]/25"
                  : "border-border/70 bg-card"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                  {variant}
                </h2>
                {isActive ? (
                  <span className="rounded-full bg-[color:var(--md-sys-color-primary)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--md-sys-color-on-primary)]">
                    Active
                  </span>
                ) : null}
              </div>

              <div className="space-y-2">
                {[0, 1, 2].map((surface) => (
                  <div
                    key={surface}
                    className={`rounded-[var(--md-shape-md)] border border-border/60 p-3 ${surfaceClass(
                      surface
                    )}`}
                  >
                    <div className="flex items-center gap-3">
                      <BrandMark variant={variant} size="sm" />
                      <BrandMark variant={variant} size="lg" />
                    </div>
                    <p className={`mt-2 text-[11px] ${labelClass(surface)}`}>
                      surface-{surface + 1}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
