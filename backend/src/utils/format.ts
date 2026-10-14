const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const count = new Intl.NumberFormat('en-IN');

export const formatInr = (rupees: number): string => inr.format(rupees);
export const formatViews = (views: number): string => count.format(views);
