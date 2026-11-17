import { GST_TYPES } from './constants';
import { formatINR } from './format';

/**
 * Rows shown under "Final Project Price" in the PDF and the preview,
 * depending on the GST option. Every row: { label, value, strong? }.
 */
export function gstSummaryRows(q) {
  const rate = Number(q.gstRate) || 0;
  if (q.gstType === GST_TYPES.INCLUDED) {
    return [
      { label: 'Base Amount (excluding GST)', value: formatINR(q.finalPrice - q.gstAmount) },
      { label: `GST @ ${rate}% (included in price)`, value: formatINR(q.gstAmount) },
    ];
  }
  if (q.gstType === GST_TYPES.EXCLUDED) {
    return [
      { label: `GST @ ${rate}% (added on top)`, value: formatINR(q.gstAmount) },
      { label: 'Grand Total (including GST)', value: formatINR(q.grandTotal), strong: true },
    ];
  }
  return [{ label: 'GST', value: 'Not applicable' }];
}

export const quantityText = (c) => `${c.quantity}${c.unit ? ` ${c.unit}` : ''}`;
