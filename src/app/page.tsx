import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="panel">
        <h1 className="title">BACKROOMS // VHS SIM</h1>
        <p className="subtitle">
          Infinite procedural yellow-office maze in first person with deterministic chunk generation,
          desktop WASD controls, and analog tape-style image artifacts.
        </p>

        <div className="button-row">
          <Link className="button" href="/play">
            Enter The Backrooms
          </Link>
          <Link className="button secondary" href="/settings">
            Graphics & Controls
          </Link>
        </div>

        <div className="kv-grid">
          <article className="kv-card">
            <span className="k">Controls</span>
            <span className="v">W A S D + Mouse Look</span>
          </article>
          <article className="kv-card">
            <span className="k">Generation</span>
            <span className="v">Infinite Session Seed</span>
          </article>
          <article className="kv-card">
            <span className="k">Target</span>
            <span className="v">Desktop 60 FPS</span>
          </article>
        </div>
      </section>
    </main>
  );
}
