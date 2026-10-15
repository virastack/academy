import type { LanguageModel } from 'ai';
import { fakeModel } from './fake-model';

// Varsayılan: sahte model (anahtar gerekmez, ücretsiz).
// Gerçek model için .env.local içine AI_MODEL (AI Gateway model adı) ve AI_GATEWAY_API_KEY yazın.
export function getModel(): LanguageModel {
  return process.env.AI_MODEL ?? fakeModel;
}
