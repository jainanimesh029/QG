export const GST_TYPES = {
  INCLUDED: 'included',
  EXCLUDED: 'excluded',
  NA: 'na',
};

export const GST_OPTIONS = [
  { value: GST_TYPES.INCLUDED, label: 'GST Included' },
  { value: GST_TYPES.EXCLUDED, label: 'GST Excluded' },
  { value: GST_TYPES.NA, label: 'GST Not Applicable' },
];

export const PAYMENT_TERMS = {
  SPLIT: '50-50',
  FULL: 'full',
};

export const PAYMENT_OPTIONS = [
  { value: PAYMENT_TERMS.SPLIT, label: '50% Advance, 50% Before Dispatch' },
  { value: PAYMENT_TERMS.FULL, label: 'Full Payment in Advance' },
];

export const PRICE_TYPES = {
  RETAIL: 'retail',
  BULK: 'bulk',
};

export const DEFAULT_GST_RATE = 18;
export const DEFAULT_VALIDITY_DAYS = 7;
