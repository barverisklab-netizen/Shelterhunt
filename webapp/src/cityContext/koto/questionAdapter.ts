import type { CityQuestionAdapter } from "@/cityContext/types";
import { KOTO_GEOJSON_SOURCES } from "@/data/kotoGeojsonSources";
import kotoCityConfigRaw from "../../../../data/city-config/koto.json";

const kotoCityConfig = kotoCityConfigRaw as {
  questionCatalog: CityQuestionAdapter["questionCatalog"];
  poiTypes: CityQuestionAdapter["poiTypes"];
  nearbyQuestion: CityQuestionAdapter["nearbyQuestion"];
  designatedShelter: CityQuestionAdapter["designatedShelter"];
};

export const kotoQuestionAdapter: CityQuestionAdapter = {
  translationNamespace: "koto",
  questionCatalog: kotoCityConfig.questionCatalog,
  poiTypes: kotoCityConfig.poiTypes,
  nearbyQuestion: kotoCityConfig.nearbyQuestion,
  designatedShelter: kotoCityConfig.designatedShelter,
  proximity: {
    geojsonUrls: [
      KOTO_GEOJSON_SOURCES.shelters,
      KOTO_GEOJSON_SOURCES.support,
      KOTO_GEOJSON_SOURCES.landmarks,
    ],
  },
  buildQuestionFallback: (attribute) => {
    if (attribute.kind === "number" && attribute.id.endsWith("250m")) {
      return `Are there {param} ${attribute.label}?`;
    }
    return `Is the ${attribute.label} {param}?`;
  },
  buildClueFallback: (attribute) => {
    if (attribute.id.endsWith("250m")) {
      return `There are {param} ${attribute.label}`;
    }
    return `The ${attribute.label} is {param}`;
  },
  nearbyAmenityQuestionFallback: "Are there nearby amenities within 250m?",
};
