import Component from '@/models/Component';
import { ApiError, isValidId, json, route } from '@/lib/api';
import { validateComponent } from '@/lib/componentPayload';

export const dynamic = 'force-dynamic';

function checkId(id) {
  if (!isValidId(id)) throw new ApiError(400, 'Invalid component id.');
}

export const PUT = route(async (request, { params }) => {
  checkId(params.id);
  const body = await request.json().catch(() => ({}));
  const { data, errors } = validateComponent(body);
  if (Object.keys(errors).length) throw new ApiError(400, 'Please fix the highlighted fields.', errors);

  const clash = await Component.exists({ name: data.name, _id: { $ne: params.id } }).collation({
    locale: 'en',
    strength: 2,
  });
  if (clash) {
    throw new ApiError(409, 'A component with this name already exists.', {
      name: 'A component with this name already exists.',
    });
  }

  const updated = await Component.findByIdAndUpdate(params.id, data, {
    returnDocument: 'after',
    runValidators: true,
  }).lean();
  if (!updated) throw new ApiError(404, 'Component not found.');
  return json(updated);
});

export const DELETE = route(async (_request, { params }) => {
  checkId(params.id);
  const deleted = await Component.findByIdAndDelete(params.id).lean();
  if (!deleted) throw new ApiError(404, 'Component not found.');
  return json({ ok: true });
});
