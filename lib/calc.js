import { GST_TYPES, PAYMENT_TERMS, PRICE_TYPES } from './constants';

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const toNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export function unitPriceFor(item) {
  return item.priceType === PRICE_TYPES.BULK ? toNum(item.bulkPrice) : toNum(item.retailPrice);
}

/**
 * Single source of truth for all quotation maths. Used by the form (live
 * preview) and by the API (re-computed on save so stored values can never be
 * out of sync with the inputs).
 */
export function calculateTotals({
  items = [],
  additionalCharges = 0,
  isPriceOverridden = false,
  overridePrice = 0,
  gstType = GST_TYPES.NA,
  gstRate = 18,
  paymentTerms = PAYMENT_TERMS.SPLIT,
}) {
  const lines = items.map((item) => {
    const unitPrice = unitPriceFor(item);
    return { unitPrice, lineTotal: round2(toNum(item.quantity) * unitPrice) };
  });

  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const extra = round2(Math.max(0, toNum(additionalCharges)));
  const autoPrice = round2(subtotal + extra);
  const finalPrice = isPriceOverridden ? round2(Math.max(0, toNum(overridePrice))) : autoPrice;

  const rate = gstType === GST_TYPES.NA ? 0 : Math.max(0, toNum(gstRate));
  let gstAmount = 0;
  let baseAmount = finalPrice;
  let grandTotal = finalPrice;

  if (gstType === GST_TYPES.INCLUDED) {
    baseAmount = round2(finalPrice / (1 + rate / 100));
    gstAmount = round2(finalPrice - baseAmount);
    grandTotal = finalPrice;
  } else if (gstType === GST_TYPES.EXCLUDED) {
    gstAmount = round2((finalPrice * rate) / 100);
    grandTotal = round2(finalPrice + gstAmount);
  }

  let milestones;
  if (paymentTerms === PAYMENT_TERMS.FULL) {
    milestones = [{ label: 'Full Payment in Advance', percent: 100, amount: grandTotal }];
  } else {
    const first = round2(grandTotal / 2);
    milestones = [
      { label: 'Advance Payment', percent: 50, amount: first },
      { label: 'Before Dispatch', percent: 50, amount: round2(grandTotal - first) },
    ];
  }

  return {
    lines,
    subtotal,
    additionalCharges: extra,
    autoPrice,
    finalPrice,
    baseAmount,
    gstRate: rate,
    gstAmount,
    grandTotal,
    milestones,
  };
}
