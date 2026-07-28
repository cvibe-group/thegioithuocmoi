import type { BrandingSettings } from "@/data/queries";

export function BrandingStyle({ branding }: { branding: BrandingSettings }) {
  const css = `
:root {
  --brand: ${branding.brandPrimary};
  --brand-light: ${branding.brandLight};
  --brand-muted: ${branding.brandMuted};
  --border-light: ${branding.borderLight};
}
`.trim();

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
