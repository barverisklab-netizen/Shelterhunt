import type { Question } from "@/types/game";

export const isAtMostQuestion = (question: Question & { evaluationMode?: "equals" | "atMost" }) =>
  question.evaluationMode === "atMost";

export function buildClueText(
  question: Question & { clueTemplate?: string; evaluationMode?: "equals" | "atMost" },
  guessedParam: string | number,
  expected: string | number | null,
): { text: string; value: string | number | null } {
  const clueTemplate = question.clueTemplate || question.text;
  const clueValue = isAtMostQuestion(question) && expected !== undefined && expected !== null
    ? expected
    : guessedParam ?? expected;

  return {
    text: clueTemplate.replace("{param}", `${clueValue ?? ""}`),
    value: clueValue,
  };
}
