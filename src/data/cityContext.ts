export interface QuestionCategory {
  id: 'location' | 'facility' | 'nearby' | 'capacity';
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

export const bostonCityContext: CityContext = {
  cityName: "Boston",
  mapConfig: {
    basemapUrl: "mapbox://styles/mapbox/dark-v11",
    startLocation: {
      lat: 42.370,
      lng: -71.033
    },
    minZoom: 12,
    maxZoom: 18
  },
  questionCategories: [
    {
      id: "location",
      name: "Location Details",
      description: "Ask about surge inundation and environmental factors",
      icon: "MapPin"
    },
    {
      id: "facility",
      name: "Facility Type",
      description: "Ask about the type and purpose of this facility",
      icon: "Home"
    },
    {
      id: "nearby",
      name: "Nearby Amenities",
      description: "Ask about facilities and services in the area",
      icon: "Radar"
    },
    {
      id: "capacity",
      name: "Capacity & Resources",
      description: "Ask about the shelter's capacity and resources",
      icon: "Users"
    }
  ]
};
