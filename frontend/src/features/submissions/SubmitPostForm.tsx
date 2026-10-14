'use client';

import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { errorMessage } from '@/lib/api';
import { submissionApi } from '@/services/submissionApi';
import type { Campaign } from '@/types/api';

const EXAMPLES: Record<Campaign['platform'], string> = {
  instagram: 'https://www.instagram.com/reel/…',
  youtube: 'https://youtu.be/…',
};

export function SubmitPostForm({ campaign, onSubmitted }: { campaign: Campaign; onSubmitted: () => void }) {
  const [postUrl, setPostUrl] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!postUrl.trim()) {
      setError('Paste the link to your post');
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await submissionApi.create({ campaignId: campaign.id, postUrl });
      toast.success('Post submitted. Earnings update as views come in.');
      setPostUrl('');
      onSubmitted();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <Field
        label="Post link"
        type="url"
        inputMode="url"
        placeholder={EXAMPLES[campaign.platform]}
        value={postUrl}
        onChange={(e) => setPostUrl(e.target.value)}
        error={error}
        hint={`Public ${campaign.platform === 'instagram' ? 'Instagram post or reel' : 'YouTube video or short'} link.`}
        className="flex-1"
      />
      <Button type="submit" loading={submitting} className="sm:mt-7" icon={<Send className="size-4" aria-hidden />}>
        Submit post
      </Button>
    </form>
  );
}
