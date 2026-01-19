import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <Toaster />
    </Providers>
  );
}
