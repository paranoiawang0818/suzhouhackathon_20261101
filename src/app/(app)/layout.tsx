export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">{children}</main>;
}
