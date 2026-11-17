import Quotation from '@/models/Quotation';
import { ApiError, isValidId, json, route } from '@/lib/api';
import { buildQuotationData } from '@/lib/quotationPayload';

export const dynamic = 'force-dynamic';

function checkId(id) {
  if (!isValidId(id)) throw new ApiError(400, 'Invalid quotation id.');
}

export const GET = route(async (_request, { params }) => {
  checkId(params.id);
  const quotation = await Quotation.findById(params.id).lean();
  if (!quotation) throw new ApiError(404, 'Quotation not found.');
  return json(quotation);
});

export const PUT = route(async (request, { params }) => {
  checkId(params.id);
  const body = await request.json().catch(() => ({}));
  const { data, errors } = buildQuotationData(body);

  const quotationId = String(body.quotationId || '').trim();
  if (!quotationId) errors.quotationId = 'Quotation ID is required.';
  else if (/[\\/]/.test(quotationId)) errors.quotationId = 'Quotation ID cannot contain slashes.';
  else if (await Quotation.exists({ quotationId, _id: { $ne: params.id } })) {
    errors.quotationId = `Quotation ID "${quotationId}" already exists.`;
  }

  if (Object.keys(errors).length) {
    throw new ApiError(errors.quotationId?.includes('exists') ? 409 : 400, 'Please fix the highlighted fields.', errors);
  }

  const updated = await Quotation.findByIdAndUpdate(
    params.id,
    { ...data, quotationId },
    { returnDocument: 'after', runValidators: true }
  ).lean();
  if (!updated) throw new ApiError(404, 'Quotation not found.');
  return json(updated);
});

export const DELETE = route(async (_request, { params }) => {
  checkId(params.id);
  const deleted = await Quotation.findByIdAndDelete(params.id).lean();
  if (!deleted) throw new ApiError(404, 'Quotation not found.');
  return json({ ok: true });
});
