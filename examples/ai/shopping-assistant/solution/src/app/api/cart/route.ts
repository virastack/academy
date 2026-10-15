import { getCart } from '@/lib/cart';

export async function GET(req: Request) {
  const userId = req.headers.get('x-user-id') ?? 'anon';
  const items = getCart(userId);
  return Response.json({ count: items.reduce((n, i) => n + i.quantity, 0), items });
}
