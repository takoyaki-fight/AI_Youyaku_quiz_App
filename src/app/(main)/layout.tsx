import { AuthGuard } from "@/components/common/AuthGuard";
import { Header } from "@/components/common/Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header />
        <main>{children}</main>
      </div>
    </AuthGuard>
  );
}
