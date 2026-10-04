import { HeartPulse, KeyRound, Mail, UserRound, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChangePasswordForm,
  MedicalInfoForm,
  NextOfKinForm,
  PersonalInfoForm,
} from '@/features/donors/components/profile-forms';
import { useMyProfile } from '@/features/donors/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatDate } from '@/lib/format';

const TABS = ['personal', 'medical', 'kin', 'security'] as const;
type Tab = (typeof TABS)[number];

export function DonorProfilePage() {
  useDocumentTitle('My profile');
  const { data: profile, isPending, isError, error, refetch, isFetching } = useMyProfile();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? '') ? (tabParam as Tab) : 'personal';

  return (
    <div className="space-y-6">
      <PageHeader title="My profile" description="Personal, medical and next-of-kin details used by hospitals and administrators." />

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />
      ) : isPending ? (
        <div className="space-y-4" role="status" aria-label="Loading profile">
          <Skeleton className="h-10 w-full max-w-lg" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <Card className="p-5">
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Donor ID</dt>
                <dd className="mt-0.5 font-mono font-medium">{profile.donorCode}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Sign-in email
                </dt>
                <dd className="mt-0.5 break-all font-medium">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Registered since</dt>
                <dd className="mt-0.5 font-medium">{formatDate(profile.createdAt)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">To change your sign-in email, contact an administrator.</p>
          </Card>

          <Tabs
            value={tab}
            onValueChange={(v) =>
              setParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('tab', v);
                  return next;
                },
                { replace: true },
              )
            }
          >
            <TabsList className="w-full justify-start sm:w-auto">
              <TabsTrigger value="personal">
                <UserRound aria-hidden="true" /> Personal
              </TabsTrigger>
              <TabsTrigger value="medical">
                <HeartPulse aria-hidden="true" /> Medical &amp; care
              </TabsTrigger>
              <TabsTrigger value="kin">
                <Users aria-hidden="true" /> Next of kin
              </TabsTrigger>
              <TabsTrigger value="security">
                <KeyRound aria-hidden="true" /> Password
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Personal details</CardTitle>
                  <CardDescription>Your name, contact number and address.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PersonalInfoForm profile={profile} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medical">
              <Card>
                <CardHeader>
                  <CardTitle>Medical &amp; care</CardTitle>
                  <CardDescription>Your registered hospital, personal doctor and medical history.</CardDescription>
                </CardHeader>
                <CardContent>
                  <MedicalInfoForm profile={profile} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="kin">
              <Card>
                <CardHeader>
                  <CardTitle>Next of kin</CardTitle>
                  <CardDescription>The person who may be contacted about your donation decision.</CardDescription>
                </CardHeader>
                <CardContent>
                  <NextOfKinForm profile={profile} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Change password</CardTitle>
                  <CardDescription>You will stay signed in on this device after changing it.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChangePasswordForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
