import { API_BASE_URL } from "@/config/runtime";
import type { QuestionAttribute } from "@/types/game";

let attributesPromise: Promise<QuestionAttribute[]> | null = null;

async function requestQuestionAttributes(): Promise<QuestionAttribute[]> {
  const response = await fetch(`${API_BASE_URL}/question-attributes`);
  if (!response.ok) {
    throw new Error(`Failed to load question attributes: ${response.status} ${response.statusText}`);
  }
  const payload = (await response.json()) as { attributes: QuestionAttribute[] };
  return payload.attributes ?? [];
}

export function getQuestionAttributes(force = false): Promise<QuestionAttribute[]> {
  if (!attributesPromise || force) {
    attributesPromise = requestQuestionAttributes();
  }
  return attributesPromise;
}
