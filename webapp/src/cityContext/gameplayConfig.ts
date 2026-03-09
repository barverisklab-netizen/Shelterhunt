import { deployedCity, deployedCityQuestionAdapter } from "@/cityContext/deployedCity";
import type { CityPoiType, CityQuestionCatalogItem } from "@/cityContext/types";

const normalize = (value: string) => value.trim().toLowerCase();

export const cityQuestionCatalog = deployedCityQuestionAdapter.questionCatalog;

export const cityQuestionById = cityQuestionCatalog.reduce<Record<string, CityQuestionCatalogItem>>(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {},
);

export const cityPoiTypes: CityPoiType[] = deployedCityQuestionAdapter.poiTypes;

export const cityPoiTypeByQuestionId = cityPoiTypes.reduce<Record<string, CityPoiType>>(
  (acc, item) => {
    acc[item.questionId] = item;
    return acc;
  },
  {},
);

export const cityAmenityCategoryMap = cityPoiTypes.reduce<Record<string, string>>(
  (acc, poiType) => {
    poiType.rawCategoryMatchers.forEach((rawCategory) => {
      acc[rawCategory] = poiType.questionId;
      acc[normalize(rawCategory)] = poiType.questionId;
    });
    return acc;
  },
  {},
);

export const resolveCityAmenityQuestionId = (rawCategory: string) => {
  const direct = cityAmenityCategoryMap[rawCategory];
  if (direct) return direct;
  return cityAmenityCategoryMap[normalize(rawCategory)];
};

export const cityNearbyQuestionConfig = deployedCityQuestionAdapter.nearbyQuestion;

const designatedCategoryMatchers = deployedCityQuestionAdapter.designatedShelter.categoryMatchers.map(
  (value) => normalize(value),
);
const designatedLayerMatchers = deployedCityQuestionAdapter.designatedShelter.layerLabelMatchers.map(
  (value) => normalize(value),
);

export const isDesignatedShelterCategory = (category?: string | null) => {
  const normalized = normalize(String(category ?? ""));
  if (!normalized) return false;
  return designatedCategoryMatchers.some((matcher) => normalized.includes(matcher));
};

export const isDesignatedShelterLayerLabel = (label?: string | null) => {
  const normalized = normalize(String(label ?? ""));
  if (!normalized) return false;
  return designatedLayerMatchers.some((matcher) => normalized.includes(matcher));
};

export const getCityPoiTypeLabel = (
  poiType: CityPoiType,
  t: (key: string, options?: { fallback?: string }) => string,
) => {
  const fallback = cityQuestionById[poiType.questionId]?.label ?? poiType.id;
  return t(`questions.city.${deployedCity.id}.poiTypes.${poiType.id}.label`, {
    fallback,
  });
};
