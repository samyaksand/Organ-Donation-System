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
        <p className="container py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} OrganFlow. Information here does not replace advice from your medical team.
        </p>
      </div>
    </footer>
  );
}
