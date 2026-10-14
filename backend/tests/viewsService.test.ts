import { Types } from 'mongoose';
import { Campaign } from '../src/models/Campaign';
import { Submission } from '../src/models/Submission';
import { updateSubmissionViews } from '../src/services/viewsService';
import { useTestDatabase } from './helpers/db';
import { makeCampaign, makeSubmission } from './helpers/fixtures';

useTestDatabase();

async function reload(id: Types.ObjectId) {
  const [campaign, submission] = await Promise.all([Campaign.findById(id), Submission.find({ campaign: id })]);
  return { campaign: campaign!, submissions: submission };
}

/** The invariant every test checks: money paid to posts equals money spent, and never exceeds the budget. */
async function expectBooksBalance(campaignId: Types.ObjectId): Promise<void> {
  const { campaign, submissions } = await reload(campaignId);
  const totalPaid = submissions.reduce((sum, s) => sum + s.paidAmount, 0);
  expect(campaign.spentAmount).toBe(totalPaid);
  expect(campaign.spentAmount).toBeLessThanOrEqual(campaign.totalBudget);
}

describe('updateSubmissionViews', () => {
  it('pays a milestone that fits in the budget', async () => {
    const campaign = await makeCampaign(10_000);
    const submission = await makeSubmission(campaign);

    const result = await updateSubmissionViews(submission.id, 10_000);

    expect(result.payout).toMatchObject({ action: 'paid', amountPaid: 500, blockedAmount: 0 });
    expect(result.submission).toMatchObject({
      views: 10_000,
      paidAmount: 500,
      eligiblePayout: 500,
      payoutStatus: 'paid',
    });
    expect(result.campaign).toMatchObject({ spentAmount: 500, remainingBudget: 9_500, status: 'live' });
    await expectBooksBalance(campaign._id);
  });

  it('records views without paying below the first milestone', async () => {
    const campaign = await makeCampaign(10_000);
    const submission = await makeSubmission(campaign);

    const result = await updateSubmissionViews(submission.id, 9_999);

    expect(result.payout.action).toBe('none');
    expect(result.submission).toMatchObject({ views: 9_999, paidAmount: 0, payoutStatus: 'pending' });
  });

  it('pays only the increment when the next milestone is reached', async () => {
    const campaign = await makeCampaign(10_000);
    const submission = await makeSubmission(campaign);

    await updateSubmissionViews(submission.id, 10_000);
    const result = await updateSubmissionViews(submission.id, 50_000);

    expect(result.payout.amountPaid).toBe(1_500);
    expect(result.submission.paidAmount).toBe(2_000);
    expect(result.campaign.spentAmount).toBe(2_000);
  });

  it('crossing several milestones in one update pays the top milestone once', async () => {
    const campaign = await makeCampaign(10_000);
    const submission = await makeSubmission(campaign);

    const result = await updateSubmissionViews(submission.id, 150_000);

    expect(result.payout.amountPaid).toBe(5_000);
    expect(result.campaign.spentAmount).toBe(5_000);
  });

  it('a repeated update with unchanged views does not pay again', async () => {
    const campaign = await makeCampaign(10_000);
    const submission = await makeSubmission(campaign);

    await updateSubmissionViews(submission.id, 50_000);
    const repeat = await updateSubmissionViews(submission.id, 50_000);

    expect(repeat.payout).toMatchObject({ action: 'none', amountPaid: 0 });
    expect(repeat.campaign.spentAmount).toBe(2_000);
    await expectBooksBalance(campaign._id);
  });

  it('lower views keep earned money and never pay the same milestone twice', async () => {
    const campaign = await makeCampaign(10_000);
    const submission = await makeSubmission(campaign);

    await updateSubmissionViews(submission.id, 100_000);
    const lower = await updateSubmissionViews(submission.id, 20_000);
    expect(lower.payout.action).toBe('none');
    expect(lower.payout.message).toContain('Views went down');
    expect(lower.submission).toMatchObject({
      views: 20_000,
      eligiblePayout: 500,
      paidAmount: 5_000,
      payoutStatus: 'paid',
    });

    const backUp = await updateSubmissionViews(submission.id, 100_000);
    expect(backUp.payout.amountPaid).toBe(0);
    expect(backUp.campaign.spentAmount).toBe(5_000);
  });

  it('blocks a milestone the remaining budget cannot fully cover, without paying part of it', async () => {
    const campaign = await makeCampaign(6_000);
    const big = await makeSubmission(campaign);
    const small = await makeSubmission(campaign);

    await updateSubmissionViews(big.id, 100_000); // spends 5,000; 1,000 left
    const blocked = await updateSubmissionViews(small.id, 50_000); // needs 2,000

    expect(blocked.payout).toMatchObject({ action: 'budget_blocked', amountPaid: 0, blockedAmount: 2_000 });
    expect(blocked.submission).toMatchObject({ paidAmount: 0, eligiblePayout: 2_000, payoutStatus: 'budget_blocked' });
    expect(blocked.campaign.spentAmount).toBe(5_000);
    await expectBooksBalance(campaign._id);
  });

  it('still pays other submissions whose increment fits in what is left', async () => {
    const campaign = await makeCampaign(6_000);
    const a = await makeSubmission(campaign);
    const b = await makeSubmission(campaign);
    const c = await makeSubmission(campaign);

    await updateSubmissionViews(a.id, 100_000); // 5,000 spent, 1,000 left
    await updateSubmissionViews(b.id, 50_000); // needs 2,000 -> blocked
    const fits = await updateSubmissionViews(c.id, 10_000); // needs 500 -> paid

    expect(fits.payout.amountPaid).toBe(500);
    expect(fits.campaign).toMatchObject({ spentAmount: 5_500, remainingBudget: 500, status: 'live' });
    await expectBooksBalance(campaign._id);
  });

  it('multiple submissions share one budget and never exceed it', async () => {
    const campaign = await makeCampaign(5_000);
    const subs = await Promise.all([makeSubmission(campaign), makeSubmission(campaign), makeSubmission(campaign)]);

    const results = [];
    for (const s of subs) results.push(await updateSubmissionViews(s.id, 50_000));

    expect(results.map((r) => r.payout.action)).toEqual(['paid', 'paid', 'budget_blocked']);
    const { campaign: after } = await reload(campaign._id);
    expect(after.spentAmount).toBe(4_000);
    await expectBooksBalance(campaign._id);
  });

  it('marks the campaign exhausted once the first milestone can no longer be funded', async () => {
    const campaign = await makeCampaign(2_400);
    const submission = await makeSubmission(campaign);

    const result = await updateSubmissionViews(submission.id, 50_000); // 400 left < 500

    expect(result.campaign.status).toBe('exhausted');
    const { campaign: after } = await reload(campaign._id);
    expect(after.status).toBe('exhausted');
  });

  it('two simultaneous updates competing for the last budget: only one is paid', async () => {
    const campaign = await makeCampaign(5_000);
    const a = await makeSubmission(campaign);
    const b = await makeSubmission(campaign);

    const results = await Promise.all([updateSubmissionViews(a.id, 100_000), updateSubmissionViews(b.id, 100_000)]);

    expect(results.map((r) => r.payout.action).sort()).toEqual(['budget_blocked', 'paid']);
    const { campaign: after } = await reload(campaign._id);
    expect(after.spentAmount).toBe(5_000);
    await expectBooksBalance(campaign._id);
  });

  it('many simultaneous updates never overspend', async () => {
    const campaign = await makeCampaign(10_000);
    const subs = await Promise.all(Array.from({ length: 12 }, () => makeSubmission(campaign)));

    const results = await Promise.all(subs.map((s) => updateSubmissionViews(s.id, 50_000))); // 2,000 each

    expect(results.filter((r) => r.payout.action === 'paid')).toHaveLength(5);
    const { campaign: after } = await reload(campaign._id);
    expect(after.spentAmount).toBe(10_000);
    await expectBooksBalance(campaign._id);
  });

  it('the same update sent several times at once pays only once', async () => {
    const campaign = await makeCampaign(50_000);
    const submission = await makeSubmission(campaign);

    const results = await Promise.all(Array.from({ length: 8 }, () => updateSubmissionViews(submission.id, 100_000)));

    expect(results.filter((r) => r.payout.action === 'paid')).toHaveLength(1);
    const { campaign: after, submissions } = await reload(campaign._id);
    expect(after.spentAmount).toBe(5_000);
    expect(submissions[0]!.paidAmount).toBe(5_000);
  });

  it('a failed write rolls back the campaign charge too', async () => {
    const campaign = await makeCampaign(10_000);
    const submission = await makeSubmission(campaign);
    // The campaign is charged first, then saving the submission fails.
    const saveSpy = jest
      .spyOn(Submission.prototype, 'save')
      .mockRejectedValueOnce(new Error('simulated write failure'));

    await expect(updateSubmissionViews(submission.id, 50_000)).rejects.toThrow('simulated write failure');
    saveSpy.mockRestore();

    const { campaign: after, submissions } = await reload(campaign._id);
    expect(after.spentAmount).toBe(0);
    expect(submissions[0]).toMatchObject({ views: 0, paidAmount: 0 });

    // And the next attempt works normally.
    const retry = await updateSubmissionViews(submission.id, 50_000);
    expect(retry.payout.amountPaid).toBe(2_000);
    await expectBooksBalance(campaign._id);
  });

  it('rejects an unknown submission and invalid view counts', async () => {
    await expect(updateSubmissionViews(new Types.ObjectId().toString(), 10)).rejects.toMatchObject({ statusCode: 404 });
    await expect(updateSubmissionViews(new Types.ObjectId().toString(), -1)).rejects.toMatchObject({ statusCode: 400 });
  });
});
