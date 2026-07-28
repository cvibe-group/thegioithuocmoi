import { SidebarPanels } from "@/components/SidebarPanels";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LOGO_SRC } from "@/data/constants";
import {
  getBrandingFromDb,
  getNavItemsFromDb,
  getSidebarPanelsFromDb,
} from "@/data/queries";

interface PageShellProps {
  children: React.ReactNode;
  withSidebar?: boolean;
  fullWidth?: boolean;
}

export async function PageShell({
  children,
  withSidebar = true,
  fullWidth = false,
}: PageShellProps) {
  const [navItems, sidebarPanels, branding] = await Promise.all([
    getNavItemsFromDb(),
    getSidebarPanelsFromDb(),
    getBrandingFromDb(),
  ]);

  return (
    <>
      <SiteHeader navItems={navItems} logoSrc={branding.logoSrc || LOGO_SRC} />
      <main className="mx-auto max-w-[1140px] px-[15px] py-6">
        {withSidebar && !fullWidth ? (
          <div className="grid gap-[30px] lg:grid-cols-[minmax(0,1fr)_238px]">
            <div className="min-w-0">{children}</div>
            <SidebarPanels
              panels={sidebarPanels}
              className="lg:sticky lg:top-[90px] lg:self-start"
            />
          </div>
        ) : (
          children
        )}
      </main>
      <SiteFooter />
    </>
  );
}
