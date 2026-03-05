import type { CityQuestionAdapter } from "@/cityContext/types";

export const kotoQuestionAdapter: CityQuestionAdapter = {
  translationNamespace: "koto",
  attributeCategoryMap: {
    floodDepth: "location",
    stormSurgeDepth: "location",
    floodDuration: "location",
    inlandWatersDepth: "location",
    facilityType: "facility",
    shelterCapacity: "facility",
    waterStation250m: "nearby",
    hospital250m: "nearby",
    aed250m: "nearby",
    emergencySupplyStorage250m: "nearby",
    communityCenter250m: "nearby",
    trainStation250m: "nearby",
    shrineTemple250m: "nearby",
    floodgate250m: "nearby",
    bridge250m: "nearby",
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
