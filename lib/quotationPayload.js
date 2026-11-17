import { calculateTotals, toNum, unitPriceFor } from './calc';
import { GST_TYPES, PAYMENT_TERMS, PRICE_TYPES } from './constants';

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Validates the request body and builds the document to store.
 * All derived numbers are recomputed here; client-sent totals are ignored.
 * Returns { data, errors }.
 */
export function buildQuotationData(body = {}) {
  const errors = {};

  const clientName = String(body.clientName || '').trim();
  if (!clientName) errors.clientName = 'Client name is required.';

  const quotationDate = parseDate(body.quotationDate);
  if (!quotationDate) errors.quotationDate = 'Quotation date is required.';

  const validUntil = parseDate(body.validUntil);
  if (!validUntil) errors.validUntil = 'Valid until date is required.';
  else if (quotationDate && validUntil < quotationDate)
    errors.validUntil = 'Valid until cannot be before the quotation date.';

  const deliveryTarget = parseDate(body.deliveryTarget);
  if (!deliveryTarget) errors.deliveryTarget = 'Delivery target is required.';

  const estimatedDuration = String(body.estimatedDuration || '').trim();
  if (!estimatedDuration) errors.estimatedDuration = 'Estimated duration is required.';

  const projectOverview = String(body.projectOverview || '').trim();
  if (!projectOverview) errors.projectOverview = 'Project overview is required.';

  const scope = (Array.isArray(body.scope) ? body.scope : [])
    .map((s) => String(s || '').trim())
    .filter(Boolean);

  const rawItems = Array.isArray(body.components) ? body.components : [];
  const items = rawItems.map((c) => ({
    componentId: /^[a-f\d]{24}$/i.test(String(c.componentId)) ? c.componentId : undefined,
    name: String(c.name || '').trim(),
    quantity: toNum(c.quantity),
    unit: String(c.unit || '').trim(),
    priceType: c.priceType === PRICE_TYPES.BULK ? PRICE_TYPES.BULK : PRICE_TYPES.RETAIL,
    bulkPrice: toNum(c.bulkPrice),
    retailPrice: toNum(c.retailPrice),
  }));
  if (items.some((i) => !i.name || i.quantity <= 0))
    errors.components = 'Every component needs a name and a quantity greater than 0.';

  const gstType = Object.values(GST_TYPES).includes(body.gstType) ? body.gstType : GST_TYPES.NA;
  const gstRate = body.gstRate === undefined || body.gstRate === '' ? 18 : toNum(body.gstRate);
  if (gstType !== GST_TYPES.NA && (gstRate < 0 || gstRate > 100))
    errors.gstRate = 'GST rate must be between 0 and 100.';

  const paymentTerms = Object.values(PAYMENT_TERMS).includes(body.paymentTerms)
    ? body.paymentTerms
    : PAYMENT_TERMS.SPLIT;

  const isPriceOverridden = Boolean(body.isPriceOverridden);
  const totals = calculateTotals({
    items,
    additionalCharges: body.additionalCharges,
    isPriceOverridden,
    overridePrice: body.finalPrice,
    gstType,
    gstRate,
    paymentTerms,
  });

  if (totals.finalPrice <= 0)
    errors.finalPrice = 'Final price must be greater than 0. Add components or a service fee.';

  const data = {
    quotationDate,
    validUntil,
    clientName,
    deliveryTarget,
    estimatedDuration,
    projectOverview,
    scope,
    components: items.map((item, i) => ({
      ...item,
      unitPrice: unitPriceFor(item),
      lineTotal: totals.lines[i].lineTotal,
    })),
    subtotal: totals.subtotal,
    additionalCharges: totals.additionalCharges,
    finalPrice: totals.finalPrice,
    isPriceOverridden,
    gstType,
    gstRate: totals.gstRate,
    gstAmount: totals.gstAmount,
    grandTotal: totals.grandTotal,
    paymentTerms,
    milestones: totals.milestones,
  };

  return { data, errors };
}
