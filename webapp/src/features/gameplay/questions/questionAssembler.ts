import type { Question, QuestionAttribute, ShelterAnswerValue } from "@/types/game";
import type { CityQuestionAdapter } from "@/cityContext/types";

export type RuntimeQuestion = Question & { clueTemplate?: string };

export const NEARBY_AMENITY_IDS = new Set([
  "waterStation250m",
  "hospital250m",
  "aed250m",
  "emergencySupplyStorage250m",
  "communityCenter250m",
  "trainStation250m",
  "shrineTemple250m",
  "floodgate250m",
  "bridge250m",
]);

interface TranslateFn {
  (key: string, options?: { fallback?: string; replacements?: Record<string, string | number> }): string;
}

interface BuildQuestionsParams {
  attributes: QuestionAttribute[];
  solvedQuestions: string[];
  adapter: CityQuestionAdapter;
  t: TranslateFn;
  getSecretAnswer: (attributeId: string) => ShelterAnswerValue;
}

const resolveTranslation = (
  t: TranslateFn,
  keys: string[],
  fallback: string,
): string => {
  for (const key of keys) {
    const value = t(key, { fallback: "" }).trim();
    if (value.length > 0 && value !== key) {
      return value;
    }
  }
  return fallback;
};

const assertAdapterCoverage = (attributes: QuestionAttribute[], adapter: CityQuestionAdapter) => {
  const missingCategoryIds = attributes
    .filter((attribute) => !NEARBY_AMENITY_IDS.has(attribute.id))
    .map((attribute) => attribute.id)
    .filter((id) => !adapter.attributeCategoryMap[id]);

  if (missingCategoryIds.length > 0) {
    throw new Error(
      `Missing city question category mappings for: ${missingCategoryIds.join(", ")}`,
    );
  }
};

const buildQuestionTemplates = (
  attribute: QuestionAttribute,
  t: TranslateFn,
  adapter: CityQuestionAdapter,
): { questionText: string; clueTemplate: string } => {
  const questionFallback = adapter.buildQuestionFallback(attribute);
  const clueFallback = adapter.buildClueFallback(attribute);
  const namespace = adapter.translationNamespace?.trim();

  const questionText = resolveTranslation(
    t,
    [
      ...(namespace ? [`questions.city.${namespace}.${attribute.id}.question`] : []),
      `questions.dynamic.${attribute.id}.question`,
    ],
    questionFallback,
  );
  const clueTemplate = resolveTranslation(
    t,
    [
      ...(namespace ? [`questions.city.${namespace}.${attribute.id}.clue`] : []),
      `questions.dynamic.${attribute.id}.clue`,
    ],
    clueFallback,
  );

  return { questionText, clueTemplate };
};

export function buildBaseQuestions({
  attributes,
  solvedQuestions,
  adapter,
  t,
  getSecretAnswer,
}: BuildQuestionsParams): RuntimeQuestion[] {
  assertAdapterCoverage(attributes, adapter);

  return attributes
    .filter((attribute) => !solvedQuestions.includes(attribute.id))
    .filter((attribute) => {
      const value = getSecretAnswer(attribute.id);
      return value !== null && value !== undefined;
    })
    .filter((attribute) => !NEARBY_AMENITY_IDS.has(attribute.id))
    .map((attribute) => {
      const { questionText, clueTemplate } = buildQuestionTemplates(attribute, t, adapter);
      return {
        id: attribute.id,
        text: questionText,
        clueTemplate,
        category: adapter.attributeCategoryMap[attribute.id] ?? "location",
        paramType: attribute.kind === "number" ? "number" : "select",
        options: attribute.kind === "select" ? attribute.options : undefined,
      } satisfies RuntimeQuestion;
    });
}

export function buildNearbyAmenityQuestion(t: TranslateFn, adapter: CityQuestionAdapter): Question {
  const namespace = adapter.translationNamespace?.trim();
  return {
    id: "nearbyAmenity",
    text: resolveTranslation(
      t,
      [
        ...(namespace ? [`questions.city.${namespace}.nearbyAmenity.question`] : []),
        "questions.dynamic.nearbyAmenity.question",
      ],
      adapter.nearbyAmenityQuestionFallback,
    ),
    category: "nearby",
    paramType: "select",
    options: [],
  };
}
