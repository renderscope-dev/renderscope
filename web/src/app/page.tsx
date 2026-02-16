export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Render<span className="text-primary">Scope</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          An open-source platform for cataloging, comparing, benchmarking,
          and understanding open-source rendering engines.
        </p>
        <div className="flex gap-4 justify-center text-sm text-muted-foreground">
          <span>50+ Renderers</span>
          <span className="text-border">•</span>
          <span>7 Categories</span>
          <span className="text-border">•</span>
          <span>Open Source</span>
        </div>
        <p className="text-xs text-muted-foreground/60 pt-4">
          Under active development — scaffolding complete.
        </p>
      </div>
    </main>
  );
}
