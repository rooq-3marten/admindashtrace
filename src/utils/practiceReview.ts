import type { PracticeLog } from '../types';

/** A practice involves an agrochemical only if a product or active ingredient was recorded. */
export const isChemicalPractice = (p: Pick<PracticeLog, 'product_name' | 'active_ingredient'>): boolean =>
  Boolean((p.product_name || '').trim() || (p.active_ingredient || '').trim());

/**
 * A practice needs review when it was flagged high risk, or when a recorded chemical is not
 * NAFDAC-approved. Planting, weeding and other practices with no product are never flagged for
 * "unapproved products", because there is no product to approve.
 */
export const practiceNeedsReview = (p: PracticeLog): boolean =>
  p.risk_level === 'FLAGGED_HIGH_RISK' || (isChemicalPractice(p) && !p.nafdac_approved);
