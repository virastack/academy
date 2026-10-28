import type { LanguageModel } from 'ai';
import { fakeModel } from './fake-model';

// Default: the fake model (no key needed, free).
// For a real model, put AI_MODEL (the AI Gateway model name) and AI_GATEWAY_API_KEY in .env.local.
export function getModel(): LanguageModel {
  return process.env.AI_MODEL ?? fakeModel;
}
