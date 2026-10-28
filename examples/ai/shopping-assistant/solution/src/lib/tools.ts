import { tool } from 'ai';
import { z } from 'zod';
import { addItem } from './cart';
import { findProducts } from './products';

export function createTools(userId: string) {
  return {
    searchProducts: tool({
      description: 'Searches the product catalogue. Use it when the user names a product, a category or a price limit.',
      inputSchema: z.object({
        query: z.string().optional().describe('The term to search for, e.g. "running"'),
        maxPrice: z.number().positive().optional().describe('The highest price in TL'),
        category: z.enum(['shoes', 'clothing', 'accessory']).optional(),
      }),
      // Give the model only the fields it needs: the seller-written description is untrusted text
      execute: async (input) =>
        findProducts(input).map(({ id, name, category, price, inStock }) => ({ id, name, category, price, inStock })),
    }),

    addToCart: tool({
      description: 'Adds the product to the cart for the user. Approval is required.',
      inputSchema: z.object({
        productId: z.string().describe('The product id, e.g. p-01'),
        quantity: z.number().int().min(1).max(5),
      }),
      execute: async ({ productId, quantity }) => {
        try {
          return addItem(userId, productId, quantity);
        } catch (error) {
          console.error('[addToCart]', error); // the real error stays in the server log only
          throw new Error('The product could not be added to the cart.');
        }
      },
    }),
  };
}
