import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { GuestOnly, RequireRole } from '@/features/auth/guards';
import { PublicLayout } from '@/layouts/public-layout';
import { RootLayout } from '@/layouts/root-layout';
import { LandingPage } from '@/pages/public/landing-page';
import { NotFoundPage } from '@/pages/not-found-page';

// Portal and auth pages are split into their own chunks so the public site loads fast.
const lazyPage = <T extends Record<string, React.ComponentType>>(loader: () => Promise<T>, name: keyof T) =>
  lazy(async () => ({ default: (await loader())[name] as React.ComponentType }));

const OrganAvailabilityPage = lazyPage(() => import('@/pages/public/organ-availability-page'), 'OrganAvailabilityPage');
const HospitalDirectoryPage = lazyPage(() => import('@/pages/public/hospital-directory-page'), 'HospitalDirectoryPage');
const DonorLoginPage = lazyPage(() => import('@/pages/auth/donor-login-page'), 'DonorLoginPage');
const AdminLoginPage = lazyPage(() => import('@/pages/auth/admin-login-page'), 'AdminLoginPage');
const RegisterPage = lazyPage(() => import('@/pages/auth/register-page'), 'RegisterPage');

const DonorPortalLayout = lazyPage(() => import('@/layouts/portal-layouts'), 'DonorPortalLayout');
const AdminConsoleLayout = lazyPage(() => import('@/layouts/portal-layouts'), 'AdminConsoleLayout');
const DonorDashboardPage = lazyPage(() => import('@/pages/donor/donor-dashboard-page'), 'DonorDashboardPage');
const DonorOrgansPage = lazyPage(() => import('@/pages/donor/donor-organs-page'), 'DonorOrgansPage');
const DonorAddOrganPage = lazyPage(() => import('@/pages/donor/donor-add-organ-page'), 'DonorAddOrganPage');
const DonorProfilePage = lazyPage(() => import('@/pages/donor/donor-profile-page'), 'DonorProfilePage');
const DonorWithdrawalPage = lazyPage(() => import('@/pages/donor/donor-withdrawal-page'), 'DonorWithdrawalPage');
const AdminDashboardPage = lazyPage(() => import('@/pages/admin/admin-dashboard-page'), 'AdminDashboardPage');
const AdminDonorsPage = lazyPage(() => import('@/pages/admin/admin-donors-page'), 'AdminDonorsPage');
const AdminOrgansPage = lazyPage(() => import('@/pages/admin/admin-organs-page'), 'AdminOrgansPage');
const AdminHospitalsPage = lazyPage(() => import('@/pages/admin/admin-hospitals-page'), 'AdminHospitalsPage');
const AdminWithdrawalsPage = lazyPage(() => import('@/pages/admin/admin-withdrawals-page'), 'AdminWithdrawalsPage');

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <LandingPage /> },
          { path: 'organs', element: <OrganAvailabilityPage /> },
          { path: 'hospitals', element: <HospitalDirectoryPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: <GuestOnly />,
        children: [
          { path: 'login', element: <DonorLoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          { path: 'admin/login', element: <AdminLoginPage /> },
        ],
      },
      {
        path: 'donor',
        element: <RequireRole allow="DONOR" />,
        children: [
          {
            element: <DonorPortalLayout />,
            children: [
              { index: true, element: <DonorDashboardPage /> },
              { path: 'organs', element: <DonorOrgansPage /> },
              { path: 'organs/new', element: <DonorAddOrganPage /> },
              { path: 'profile', element: <DonorProfilePage /> },
              { path: 'withdrawal', element: <DonorWithdrawalPage /> },
            ],
          },
        ],
      },
      {
        path: 'admin',
        element: <RequireRole allow="ADMIN" />,
        children: [
          {
            element: <AdminConsoleLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: 'donors', element: <AdminDonorsPage /> },
              { path: 'organs', element: <AdminOrgansPage /> },
              { path: 'hospitals', element: <AdminHospitalsPage /> },
              { path: 'withdrawals', element: <AdminWithdrawalsPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
