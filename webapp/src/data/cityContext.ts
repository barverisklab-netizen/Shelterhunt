export interface QuestionCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface CityContext {
  cityName: string;
  helpVideoUrl?: string;
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
  helpVideoUrl: "https://vimeo.com/1154694542",
  mapConfig: {
    basemapUrl: "mapbox://styles/mitfluxmap/cmebgcxpe001001qm0ek1491l",
    startLocation: {
      lat: 35.6731,
      lng: 139.8171,
    },
    minZoom: 12,
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
      name: "Facility & Resources",
      description: "Ask about facility type, capacity, and resources",
      icon: "Home",
    },
    {
      id: "nearby",
      name: "Nearby Amenities",
      description: "Ask about facilities and services in the area",
      icon: "Radar",
    },
  ],
};

// Export as default city context
export const defaultCityContext = kotoTokyoCityContext;
