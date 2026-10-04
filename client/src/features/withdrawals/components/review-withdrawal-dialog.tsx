import { useId, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { pluralize } from '@/lib/format';
import type { AdminWithdrawal } from '@/types/api';
import { useReviewWithdrawal } from '../hooks';

interface ReviewWithdrawalDialogProps {
  request: AdminWithdrawal | null;
  decision: 'APPROVED' | 'REJECTED';
  onOpenChange: (open: boolean) => void;
}

/** Confirm approve/decline with an optional note that the donor will see. */
export function ReviewWithdrawalDialog({ request, decision, onOpenChange }: ReviewWithdrawalDialogProps) {
  const review = useReviewWithdrawal();
  const [note, setNote] = useState('');
  const noteId = useId();
  const approving = decision === 'APPROVED';

  const close = () => {
    setNote('');
    onOpenChange(false);
  };

  const submit = async () => {
    if (!request) return;
    try {
      await review.mutateAsync({ id: request.id, payload: { status: decision, adminNote: note.trim() || null } });
      toast.success(approving ? `Withdrawal approved for ${request.donor.name}` : `Withdrawal declined for ${request.donor.name}`);
      close();
    } catch (err) {
      toast.error('Could not review request', { description: errorMessage(err) });
    }
  };

  return (
    <Dialog open={Boolean(request)} onOpenChange={(next) => !next && !review.isPending && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{approving ? 'Approve withdrawal?' : 'Decline withdrawal?'}</DialogTitle>
          <DialogDescription>
            {request?.donor.name} · <span className="font-mono">{request?.donor.donorCode}</span>
          </DialogDescription>
        </DialogHeader>
        {request && (
          <div className="space-y-4 text-sm">
            <blockquote className="whitespace-pre-line rounded-md border-l-4 border-border bg-muted/50 p-3 text-muted-foreground">{request.reason}</blockquote>
            {approving ? (
              <p>
                The donor will be marked as <strong>withdrawn</strong> and their pending or available organ records (
                {pluralize(request.donor.organCount, 'record')} in total) will be set to <strong>unavailable</strong>. Their account
                and history are kept; deleting the donor is a separate action.
              </p>
            ) : (
              <p>The donor stays active and can submit a new request later.</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor={noteId}>Note to donor (optional)</Label>
              <Textarea id={noteId} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={review.isPending}>
            Cancel
          </Button>
          <Button variant={approving ? 'default' : 'destructive'} loading={review.isPending} onClick={() => void submit()}>
            {approving ? 'Approve withdrawal' : 'Decline request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
