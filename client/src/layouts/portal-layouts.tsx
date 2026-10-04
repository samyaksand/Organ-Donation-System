import { Building2, FileClock, HeartPulse, LayoutDashboard, LogOut, UserRound, Users } from 'lucide-react';
import { useAdminOverview } from '@/features/admin/hooks';
import { DashboardLayout, type NavItem } from './dashboard-layout';

const donorNav: NavItem[] = [
  { to: '/donor', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/donor/organs', label: 'My organs', icon: HeartPulse },
  { to: '/donor/profile', label: 'Profile', icon: UserRound },
  { to: '/donor/withdrawal', label: 'Withdrawal', icon: LogOut },
];

export function DonorPortalLayout() {
  return <DashboardLayout title="Donor portal" home="/donor" nav={donorNav} />;
}

export function AdminConsoleLayout() {
  const overview = useAdminOverview();
  const nav: NavItem[] = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/donors', label: 'Donors', icon: Users },
    { to: '/admin/organs', label: 'Organs', icon: HeartPulse },
    { to: '/admin/hospitals', label: 'Hospitals', icon: Building2 },
    { to: '/admin/withdrawals', label: 'Withdrawal requests', icon: FileClock, badge: overview.data?.pendingWithdrawals },
  ];
  return <DashboardLayout title="Admin console" home="/admin" nav={nav} />;
}
