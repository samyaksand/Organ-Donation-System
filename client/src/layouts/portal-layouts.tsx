import { BarChart3, Building2, ClipboardList, FileClock, HeartPulse, LayoutDashboard, LogOut, ShieldAlert, ShieldCheck, Sparkles, UserRound, Users } from 'lucide-react';
import { useSession } from '@/features/auth/hooks';
import { useAdminOverview } from '@/features/admin/hooks';
import { DashboardLayout, type NavItem } from './dashboard-layout';

const donorNav: NavItem[] = [
  { to: '/donor', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/donor/organs', label: 'My organs', icon: HeartPulse },
  { to: '/donor/profile', label: 'Profile', icon: UserRound },
  { to: '/donor/withdrawal', label: 'Withdrawal', icon: LogOut },
  { to: '/donor/security', label: 'My Security', icon: ShieldCheck },
];

export function DonorPortalLayout() {
  return <DashboardLayout title="Donor portal" home="/donor" nav={donorNav} />;
}

export function AdminConsoleLayout() {
  const overview = useAdminOverview();
  const { data: user } = useSession();
  const nav: NavItem[] = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/operations-intelligence', label: 'Operations Intelligence', icon: Sparkles },
    { to: '/admin/donors', label: 'Donors', icon: Users },
    { to: '/admin/organs', label: 'Organs', icon: HeartPulse },
    { to: '/admin/hospitals', label: 'Hospitals', icon: Building2 },
    { to: '/admin/withdrawals', label: 'Withdrawal requests', icon: FileClock, badge: overview.data?.pendingWithdrawals },
    { to: '/admin/organ-requests', label: 'Organ requests', icon: ClipboardList, badge: overview.data?.pendingOrganRequests },
    { to: '/admin/security', label: 'Security', icon: ShieldCheck },
  ];
  // Not shown to ADMIN, only to the private SUPER_ADMIN session.
  if (user?.role === 'SUPER_ADMIN') {
    nav.push({ to: '/admin/recovery', label: 'System recovery', icon: ShieldAlert });
  }
  return <DashboardLayout title="Admin console" home="/admin" nav={nav} />;
}
