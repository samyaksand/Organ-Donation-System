import { GitFork } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/common/logo';

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 sm:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            Donor registration, organ records and hospital availability in one place, for donors, families and care teams.
          </p>
        </div>
        <nav aria-label="Explore" className="space-y-3 text-sm">
          <h2 className="font-semibold text-foreground">Explore</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link className="hover:text-foreground" to="/organs">
                Organ availability
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" to="/hospitals">
                Hospital directory
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" to="/register">
                Become a donor
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" to="/security">
                Privacy & Security
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Accounts" className="space-y-3 text-sm">
          <h2 className="font-semibold text-foreground">Accounts</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link className="hover:text-foreground" to="/login">
                Donor sign in
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" to="/admin/login">
                Administrator sign in
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <div className="container flex flex-col items-start justify-between gap-2 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p>© {new Date().getFullYear()} OrganFlow. Information here does not replace advice from your medical team.</p>
            <p>Developed by Samyak Sanjay Sand at NIT Karnataka.</p>
          </div>
          <a
            href="https://github.com/samyaksand/Organ-Donation-System"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground"
          >
            <GitFork className="h-4 w-4" aria-hidden="true" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
