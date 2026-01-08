interface MapLayoutProps {
  children: React.ReactNode;
}

export function MapLayout({ children }: MapLayoutProps) {
  return (
    <div className="relative h-screen w-full">
      <main className="h-full w-full">
        {children}
      </main>
    </div>
  );
}
