import { API_BASE_URL } from "@/config/runtime";
import type { QuestionAttribute } from "@/types/game";

let attributesPromise: Promise<QuestionAttribute[]> | null = null;
let attributesRequestVersion = 0;

async function requestQuestionAttributes(
  requestVersion: number,
  signal?: AbortSignal,
): Promise<QuestionAttribute[]> {
  const response = await fetch(`${API_BASE_URL}/question-attributes`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load question attributes: ${response.status} ${response.statusText}`);
  }
  const payload = (await response.json()) as { attributes: QuestionAttribute[] };
  if (requestVersion !== attributesRequestVersion) {
    throw new Error("Stale question attribute response ignored.");
  }
  return payload.attributes ?? [];
}

interface QuestionAttributeRequestOptions {
  force?: boolean;
  signal?: AbortSignal;
}

export function getQuestionAttributes(force?: boolean): Promise<QuestionAttribute[]>;
export function getQuestionAttributes(options?: QuestionAttributeRequestOptions): Promise<QuestionAttribute[]>;
export function getQuestionAttributes(
  forceOrOptions: boolean | QuestionAttributeRequestOptions = false,
): Promise<QuestionAttribute[]> {
  const options =
    typeof forceOrOptions === "boolean" ? { force: forceOrOptions } : forceOrOptions;
  const force = options.force ?? false;
  if (!attributesPromise || force) {
    attributesRequestVersion += 1;
    const requestVersion = attributesRequestVersion;
    attributesPromise = requestQuestionAttributes(requestVersion, options.signal).catch((error) => {
      if (requestVersion === attributesRequestVersion) {
        attributesPromise = null;
      }
      throw error;
    });
  }
  return attributesPromise;
}
