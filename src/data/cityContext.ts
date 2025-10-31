export interface QuestionCategory {
  id: "location" | "facility" | "nearby" | "capacity";
  name: string;
  description: string;
  icon: string;
}

export interface CityContext {
  cityName: string;
  mapConfig: {
    basemapUrl: string;
    startLocation: {
      lat: number;
      lng: number;
    };
    minZoom: number;
    maxZoom: number;
  };
  questionCategories: QuestionCategory[];
}

export const kotoTokyoCityContext: CityContext = {
  cityName: "Koto, Tokyo",
  mapConfig: {
    basemapUrl: "mapbox://styles/mitfluxmap/cmebgcxpe001001qm0ek1491l",
    startLocation: {
      lat: 35.6731,
      lng: 139.8171,
    },
    minZoom: 14,
    maxZoom: 18,
  },
  questionCategories: [
    {
      id: "location",
      name: "Location Details",
      description: "Ask about surge inundation and environmental factors",
      icon: "MapPin",
    },
    {
      id: "facility",
      name: "Facility Type",
      description: "Ask about the type and purpose of this facility",
      icon: "Home",
    },
    {
      id: "nearby",
      name: "Nearby Amenities",
      description: "Ask about facilities and services in the area",
      icon: "Radar",
    },
    {
      id: "capacity",
      name: "Capacity & Resources",
      description: "Ask about the shelter's capacity and resources",
      icon: "Users",
    },
  ],
};

// Export as default city context
export const defaultCityContext = kotoTokyoCityContext;
