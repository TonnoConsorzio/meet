import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="marketing-shell">
      <header className="site-nav">
        <Link className="brand-logo" href="/" aria-label="Alessio Bellan Meet">
          <Image src="/brand/alessio-bellan-mark.png" alt="" aria-hidden="true" width={36} height={36} priority />
          <span>Alessio Bellan <strong>Meet</strong></span>
        </Link>
        <Link className="nav-login" href="/login">Accedi</Link>
      </header>

      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <h1 id="home-title">Parla con le persone giuste.</h1>
          <p className="hero-lede">Riunioni di lavoro private, chiare e protette.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/login">Crea una riunione</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
