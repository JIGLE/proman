import { Sidebar } from "@/components/layouts/sidebar";
import { MobileBottomNav } from "@/components/ui/mobile-nav";
import { SkipLink } from "@/components/ui/accessibility";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      {/* Skip Navigation Links for Accessibility */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#main-navigation">Skip to navigation</SkipLink>
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0" aria-label="Sidebar navigation">
        <Sidebar />
      </aside>
      
      {/* Main Content */}
      <main id="main-content" className="flex-1 overflow-y-auto pb-16 md:pb-0" tabIndex={-1}>
        <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
