import type { Question, QuestionAttribute, ShelterAnswerValue } from "@/types/game";
import type { CityQuestionAdapter } from "@/cityContext/types";

export type RuntimeQuestion = Question & {
  clueTemplate?: string;
  source?: "shelter" | "nearby";
};

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
  const catalogById = new Map(adapter.questionCatalog.map((item) => [item.id, item]));
  const attributeIds = new Set(attributes.map((attribute) => attribute.id));

  const missingFromCatalog = attributes
    .map((attribute) => attribute.id)
    .filter((id) => !catalogById.has(id));

  if (missingFromCatalog.length > 0) {
    throw new Error(
      `Question attributes missing from city question catalog: ${missingFromCatalog.join(", ")}`,
    );
  }

  const missingAttributeSeeds = adapter.questionCatalog
    .map((item) => item.id)
    .filter((id) => !attributeIds.has(id));

  if (missingAttributeSeeds.length > 0) {
    throw new Error(
      `City question catalog ids not seeded in question_attributes: ${missingAttributeSeeds.join(", ")}`,
    );
  }

  const catalogIds = new Set(adapter.questionCatalog.map((item) => item.id));
  const invalidPoiQuestionLinks = adapter.poiTypes
    .map((poiType) => poiType.questionId)
    .filter((questionId) => !catalogIds.has(questionId));
  if (invalidPoiQuestionLinks.length > 0) {
    throw new Error(
      `City poiTypes reference unknown question ids: ${invalidPoiQuestionLinks.join(", ")}`,
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
  if (!attributes.length) {
    return [];
  }
  assertAdapterCoverage(attributes, adapter);
  const catalogById = new Map(adapter.questionCatalog.map((item) => [item.id, item]));
  const nearbyQuestionIds = new Set(
    adapter.questionCatalog
      .filter((item) => item.source === "nearby")
      .map((item) => item.id),
  );
  const shouldUsePicker = adapter.nearbyQuestion.mode === "picker";

  return attributes
    .filter((attribute) => !solvedQuestions.includes(attribute.id))
    .filter((attribute) => {
      const value = getSecretAnswer(attribute.id);
      return value !== null && value !== undefined;
    })
    .filter((attribute) => {
      if (!shouldUsePicker) return true;
      return !nearbyQuestionIds.has(attribute.id);
    })
    .map((attribute) => {
      const catalogItem = catalogById.get(attribute.id);
      if (!catalogItem) {
        throw new Error(`Missing city question catalog entry for attribute '${attribute.id}'`);
      }
      const { questionText, clueTemplate } = buildQuestionTemplates(attribute, t, adapter);
      return {
        id: attribute.id,
        text: questionText,
        clueTemplate,
        source: catalogItem.source,
        category: catalogItem.category,
        evaluationMode: catalogItem.evaluation,
        paramType: attribute.kind === "number" ? "number" : "select",
        options: attribute.kind === "select" ? attribute.options : undefined,
      } satisfies RuntimeQuestion;
    });
}

export function buildNearbyAmenityQuestion(t: TranslateFn, adapter: CityQuestionAdapter): Question {
  const namespace = adapter.translationNamespace?.trim();
  return {
    id: adapter.nearbyQuestion.questionId,
    text: resolveTranslation(
      t,
      [
        ...(namespace ? [`questions.city.${namespace}.${adapter.nearbyQuestion.questionId}.question`] : []),
        "questions.dynamic.nearbyAmenity.question",
      ],
      adapter.nearbyAmenityQuestionFallback,
    ),
    category: adapter.nearbyQuestion.categoryId,
    paramType: "select",
    options: [],
    evaluationMode: "equals",
  };
}
