import Component from '@/models/Component';
import { ApiError, json, route } from '@/lib/api';
import { validateComponent } from '@/lib/componentPayload';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const components = await Component.find().sort({ name: 1 }).collation({ locale: 'en' }).lean();
  return json(components);
});

export const POST = route(async (request) => {
  const body = await request.json().catch(() => ({}));
  const { data, errors } = validateComponent(body);
  if (Object.keys(errors).length) throw new ApiError(400, 'Please fix the highlighted fields.', errors);

  const exists = await Component.exists({ name: data.name }).collation({ locale: 'en', strength: 2 });
  if (exists) {
    throw new ApiError(409, 'A component with this name already exists.', {
      name: 'A component with this name already exists.',
    });
  }

  const created = await Component.create(data);
  return json(created.toObject(), 201);
});
