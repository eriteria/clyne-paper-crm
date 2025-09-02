export default function FinancialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
