import AuthenticatedNavbar from "@/components/AuthenticatedNavbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthenticatedNavbar />
      <main className="pt-20">
        {children}
      </main>
    </>
  );
}
