type BrandVariant = 'full' | 'tech' | 'finance' | 'happy' | 'br';
type RuntimeVariant = Exclude<BrandVariant, 'br'>;

const KNOWN_BRAND_VARIANTS: readonly BrandVariant[] = ['full', 'tech', 'finance', 'happy', 'br'] as const;

function asBrandVariant(value: string | null | undefined): BrandVariant | null {
  if (!value) return null;
  return (KNOWN_BRAND_VARIANTS as readonly string[]).includes(value)
    ? (value as BrandVariant)
    : null;
}

export const SITE_BRAND_VARIANT: BrandVariant = (() => {
  const env = asBrandVariant(import.meta.env.VITE_VARIANT) ?? 'full';
  // Build-time variant (non-full) takes priority — each deployment is variant-specific.
  // Only fall back to localStorage when env is 'full' (allows desktop app variant switching).
  if (env !== 'full') return env;
  if (typeof window !== 'undefined') {
    const stored = asBrandVariant(localStorage.getItem('worldmonitor-variant'));
    if (stored) return stored;
  }
  return env;
})();

// Keep runtime behavior aligned with the existing "world" stack.
// The BR variant is a branded full variant, so runtime checks that depend on
// `SITE_VARIANT === 'full'` continue to work without touching shared files.
export const SITE_VARIANT: RuntimeVariant = SITE_BRAND_VARIANT === 'br'
  ? 'full'
  : SITE_BRAND_VARIANT;

export const IS_BR_VARIANT = SITE_BRAND_VARIANT === 'br';
