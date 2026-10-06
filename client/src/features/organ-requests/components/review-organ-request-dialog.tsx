import { useId, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { organLabel } from '@/lib/domain';
import type { OrganRequest } from '@/types/api';
import { useReviewOrganRequest } from '../hooks';

interface ReviewOrganRequestDialogProps {
  request: OrganRequest | null;
  decision: 'APPROVED' | 'DECLINED';
  onOpenChange: (open: boolean) => void;
}

/** Confirm approve/decline. Approval allocates the organ (marks it unavailable); decline requires a reason. */
export function ReviewOrganRequestDialog({ request, decision, onOpenChange }: ReviewOrganRequestDialogProps) {
  const review = useReviewOrganRequest();
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const reasonId = useId();
  const approving = decision === 'APPROVED';

  const close = () => {
    setReason('');
    setReasonError(null);
    onOpenChange(false);
  };

  const submit = async () => {
    if (!request) return;
    if (!approving && !reason.trim()) {
      setReasonError('Provide a reason for declining this request');
      return;
    }
    try {
      await review.mutateAsync({ id: request.id, payload: { status: decision, declineReason: approving ? null : reason.trim() } });
      toast.success(approving ? `Request approved for ${request.hospital.name}` : `Request declined for ${request.hospital.name}`);
      close();
    } catch (err) {
      toast.error('Could not review request', { description: errorMessage(err) });
    }
  };

  return (
    <Dialog open={Boolean(request)} onOpenChange={(next) => !next && !review.isPending && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{approving ? 'Approve organ request?' : 'Decline organ request?'}</DialogTitle>
          <DialogDescription>
            {request?.hospital.name} · {request && organLabel(request.organ)} ({request?.organ.donorCode})
          </DialogDescription>
        </DialogHeader>
        {request && (
          <div className="space-y-4 text-sm">
            {approving ? (
              <p>
                The <strong>{organLabel(request.organ)}</strong> record will be marked <strong>unavailable</strong> (allocated to{' '}
                {request.hospital.name}). This cannot be undone from this dialog - a different request would need to be made for the same
                organ.
              </p>
            ) : (
              <>
                <p>The organ stays available and can be requested again by this or another hospital.</p>
                <div className="space-y-1.5">
                  <Label htmlFor={reasonId}>
                    Reason for declining <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id={reasonId}
                    rows={3}
                    maxLength={500}
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      if (reasonError) setReasonError(null);
                    }}
                    aria-invalid={Boolean(reasonError)}
                  />
                  {reasonError && (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {reasonError}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={review.isPending}>
            Cancel
          </Button>
          <Button variant={approving ? 'default' : 'destructive'} loading={review.isPending} onClick={() => void submit()}>
            {approving ? 'Approve request' : 'Decline request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
