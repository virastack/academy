import { tool } from 'ai';
import { z } from 'zod';
import { addItem } from './cart';
import { findProducts } from './products';

export function createTools(userId: string) {
  return {
    searchProducts: tool({
      description: 'Ürün katalogunda arar. Kullanıcı bir ürün, kategori ya da fiyat sınırı söylediğinde kullan.',
      inputSchema: z.object({
        query: z.string().optional().describe('Aranacak kelime, örn. "koşu"'),
        maxPrice: z.number().positive().optional().describe('TL cinsinden en yüksek fiyat'),
        category: z.enum(['ayakkabı', 'giyim', 'aksesuar']).optional(),
      }),
      // Modele yalnızca ihtiyacı olan alanları verin: satıcının yazdığı açıklama güvenilmeyen metindir
      execute: async (input) =>
        findProducts(input).map(({ id, name, category, price, inStock }) => ({ id, name, category, price, inStock })),
    }),

    addToCart: tool({
      description: 'Ürünü kullanıcının sepetine ekler. Kullanıcı onayı gerekir.',
      inputSchema: z.object({
        productId: z.string().describe('Ürün kimliği, örn. p-01'),
        quantity: z.number().int().min(1).max(5),
      }),
      execute: async ({ productId, quantity }) => {
        try {
          return addItem(userId, productId, quantity);
        } catch (error) {
          console.error('[addToCart]', error); // gerçek hata yalnızca sunucu logunda
          throw new Error('Ürün sepete eklenemedi.');
        }
      },
    }),
  };
}
