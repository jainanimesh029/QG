import { json, route } from '@/lib/api';
import { peekNextQuotationId } from '@/lib/quotationId';

export const dynamic = 'force-dynamic';

// Preview only - the ID is reserved atomically when the quotation is saved.
export const GET = route(async () => {
  return json({ quotationId: await peekNextQuotationId() });
});
