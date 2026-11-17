import Quotation from '@/models/Quotation';
import { ApiError, json, route } from '@/lib/api';
import { buildQuotationData } from '@/lib/quotationPayload';
import { generateQuotationId } from '@/lib/quotationId';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const quotations = await Quotation.find().sort({ createdAt: -1 }).lean();
  return json(quotations);
});

export const POST = route(async (request) => {
  const body = await request.json().catch(() => ({}));
  const { data, errors } = buildQuotationData(body);

  // `idEdited` = the user typed a custom ID, so it must be unique.
  // Otherwise a fresh ID is reserved atomically from the counter.
  const customId = body.idEdited ? String(body.quotationId || '').trim() : '';
  if (body.idEdited && !customId) errors.quotationId = 'Quotation ID is required.';
  if (customId && /[\\/]/.test(customId)) errors.quotationId = 'Quotation ID cannot contain slashes.';

  if (customId && !errors.quotationId && (await Quotation.exists({ quotationId: customId }))) {
    errors.quotationId = `Quotation ID "${customId}" already exists.`;
  }

  if (Object.keys(errors).length) {
    throw new ApiError(errors.quotationId?.includes('exists') ? 409 : 400, 'Please fix the highlighted fields.', errors);
  }

  const quotationId = customId || (await generateQuotationId());
  const created = await Quotation.create({ ...data, quotationId });
  return json(created.toObject(), 201);
});
