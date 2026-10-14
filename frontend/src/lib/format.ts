const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('en-IN');
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** ₹1,00,000 — whole rupees, Indian digit grouping. */
export const formatInr = (rupees: number): string => inr.format(rupees);
/** 1,00,000 */
export const formatViews = (views: number): string => number.format(views);
/** 1L, 10K */
export const formatCompactViews = (views: number): string => compact.format(views);
export const formatDate = (iso: string): string => date.format(new Date(iso));
