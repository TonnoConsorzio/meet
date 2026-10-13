import { LoginForm } from './LoginForm';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <div className="auth-aside">
        <Link className="brand-logo" href="/" aria-label="Alessio Bellan Meet">
          <Image src="/brand/alessio-bellan-mark.png" alt="" aria-hidden="true" width={36} height={36} priority />
          <span>Alessio Bellan <strong>Meet</strong></span>
        </Link>
      </div>
      <LoginForm />
    </main>
  );
}
