interface MapLayoutProps {
  children: React.ReactNode;
}

export function MapLayout({ children }: MapLayoutProps) {
  return (
    <div className="relative h-[100dvh] w-full">
      <main className="h-full w-full">
        {children}
      </main>
    </div>
  );
}
