import { ArrowLeft, Check, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState } from '@/components/common/error-state';
import { OrganIconTile } from '@/components/common/organ-icon';
import { OrganRequestStatusBadge } from '@/components/common/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OrganRequestFormDialog } from '@/features/organ-requests/components/organ-request-form-dialog';
import { RequestTimeline } from '@/features/organ-requests/components/request-timeline';
import { ReviewOrganRequestDialog } from '@/features/organ-requests/components/review-organ-request-dialog';
import { useCancelOrganRequest, useOrganRequest } from '@/features/organ-requests/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { organLabel } from '@/lib/domain';
import { formatDate, formatDateTime } from '@/lib/format';

export function AdminOrganRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: request, isPending, isError, error, refetch, isFetching } = useOrganRequest(id);
  useDocumentTitle(request ? `Request · ${request.hospital.name}` : 'Organ request');

  const [reviewing, setReviewing] = useState<'APPROVED' | 'DECLINED' | null>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const cancel = useCancelOrganRequest();

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" asChild>
        <Link to="/admin/organ-requests">
          <ArrowLeft aria-hidden="true" /> All requests
        </Link>
      </Button>

      {isPending || !request ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <OrganIconTile type={request.organ.organType} />
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{organLabel(request.organ)} request</h1>
                <p className="text-sm text-muted-foreground">
                  {request.hospital.name} · {request.hospital.city}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <OrganRequestStatusBadge status={request.status} />
              {request.status === 'PENDING' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setReviewing('APPROVED')}>
                    <Check aria-hidden="true" /> Approve
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setReviewing('DECLINED')}>
                    <X aria-hidden="true" /> Decline
                  </Button>
                  <Button size="sm" variant="ghost" disabled={cancel.isPending} onClick={() => cancel.mutate(request.id)}>
                    <XCircle aria-hidden="true" /> Cancel
                  </Button>
                </>
              )}
              {request.status === 'DECLINED' && (
                <Button size="sm" variant="outline" onClick={() => setResubmitting(true)}>
                  Request again
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Request details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Organ</dt>
                    <dd className="font-medium">{organLabel(request.organ)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Donor ID</dt>
                    <dd className="font-mono">{request.organ.donorCode}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Organ status</dt>
                    <dd className="font-medium">{request.organ.status}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Procured</dt>
                    <dd>{formatDate(request.organ.procurementDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Requested by</dt>
                    <dd>{request.requestedBy ?? '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Submitted</dt>
                    <dd>{formatDateTime(request.createdAt)}</dd>
                  </div>
                  {request.reviewedAt && (
                    <>
                      <div>
                        <dt className="text-xs text-muted-foreground">Reviewed by</dt>
                        <dd>{request.reviewedBy ?? '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Reviewed</dt>
                        <dd>{formatDateTime(request.reviewedAt)}</dd>
                      </div>
                    </>
                  )}
                </dl>
                {request.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-line rounded-md border-l-4 border-border bg-muted/50 p-3">{request.notes}</p>
                  </div>
                )}
                {request.declineReason && (
                  <div>
                    <p className="text-xs text-muted-foreground">Decline reason</p>
                    <p className="whitespace-pre-line rounded-md border-l-4 border-destructive/50 bg-destructive/5 p-3">{request.declineReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workflow history</CardTitle>
              </CardHeader>
              <CardContent>
                <RequestTimeline requestId={request.id} />
              </CardContent>
            </Card>
          </div>

          <ReviewOrganRequestDialog
            request={reviewing ? request : null}
            decision={reviewing ?? 'APPROVED'}
            onOpenChange={(open) => !open && setReviewing(null)}
          />
          <OrganRequestFormDialog
            open={resubmitting}
            onOpenChange={setResubmitting}
            initial={{ hospitalId: request.hospital.id, organId: request.organ.status === 'AVAILABLE' ? request.organ.id : undefined }}
          />
        </>
      )}
    </div>
  );
}
