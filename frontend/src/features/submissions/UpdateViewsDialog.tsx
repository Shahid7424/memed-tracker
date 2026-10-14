'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { errorMessage } from '@/lib/api';
import { formatViews } from '@/lib/format';
import { submissionApi } from '@/services/submissionApi';
import type { Submission, ViewUpdateResponse } from '@/types/api';
import { parseWholeNumber } from '../campaigns/campaignFormValidation';

/**
 * Stands in for real Instagram/YouTube analytics: lets a user type a new view
 * count, which the backend turns into a payout (or not).
 */
export function UpdateViewsButton({
  submission,
  onUpdated,
}: {
  submission: Submission;
  onUpdated: (result: ViewUpdateResponse) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [views, setViews] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  function open() {
    setViews(String(submission.views));
    setError(undefined);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => dialog?.close();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseWholeNumber(views);
    if (parsed === null) {
      setError('Enter a whole number of 0 or more');
      return;
    }
    setSaving(true);
    try {
      const result = await submissionApi.updateViews(submission.id, parsed);
      const notify =
        result.payout.action === 'paid'
          ? toast.success
          : result.payout.action === 'budget_blocked'
            ? toast.warning
            : toast.info;
      notify(result.payout.message);
      close();
      onUpdated(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={open} icon={<Eye className="size-4" aria-hidden />}>
        Update views
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`views-title-${submission.id}`}
        className="m-auto w-[min(100%-2rem,28rem)] rounded-2xl border border-zinc-200 p-0 shadow-xl backdrop:bg-zinc-900/30"
      >
        <form onSubmit={handleSubmit} noValidate className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={`views-title-${submission.id}`} className="text-base font-semibold text-zinc-900">
                Update view count
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Simulates the latest numbers from the platform. Currently {formatViews(submission.views)} views.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <Field
            label="Total views"
            inputMode="numeric"
            autoFocus
            value={views}
            onChange={(e) => setViews(e.target.value)}
            error={error}
            className="mt-5"
          />
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save views
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
