import { KotoLayer } from "@/types/kotoLayers";

// Koto, Tokyo Mapbox layer definitions and styling details
export const kotoLayers: KotoLayer[] = [
  // Designated Evacuation Centers
  {
    id: 2,
    label: "Designated Evacuation Centers",
    metadata: {
      query: {
        template:
          "Name: <b>{{Landmark Name (EN)}}</b> | {{Landmark Name (JP)}}<br>Category: <b>{{Category}}</b><br>Address: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: true,
      legendItems: [
        {
          label: "Designated Evacuation Centers",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Government-designated evacuation center.",
          swatchStyle: { strokeColor: "#c1272d", strokeWidth: 2 },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: { layerId: "8sbllw5a", layerName: "ihi_evacuation_centers_all-c2o5a5" },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "Designated EC"],
      layout: {
        "icon-size": 0.75,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": ["match", ["get", "Category"], "Designated EC", "ihi_dec", ""],
        "text-field": ["match", ["get", "Category"], "Designated EC", ["get", "Landmark Name (EN)"], ""],
        "text-anchor": "top",
        "text-offset": [0, 2.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // Voluntary Evacuation Centers
  {
    id: 5,
    label: "Voluntary Evacuation Centers",
    metadata: {
      query: {
        template:
          "Name: <b>{{Landmark Name (EN)}}</b> | {{Landmark Name (JP)}}<br>Category: <b>{{Category}}</b><br>Address: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Voluntary Evacuation Centers",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Voluntary evacuation center.",
          swatchStyle: { strokeColor: "#c1272d", strokeWidth: 2 },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: { layerId: "8sbllw5a", layerName: "ihi_evacuation_centers_all-c2o5a5" },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "Voluntary EC"],
      layout: {
        "icon-size": 0.8,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": ["match", ["get", "Category"], "Voluntary EC", "ihi_vec", ""],
        "text-field": ["match", ["get", "Category"], "Voluntary EC", ["get", "Landmark name (EN)"], ""],
        "text-anchor": "top",
        "text-offset": [0, 1.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // Temporary Evacuation Centers (Corporate/UR)
  {
    id: 4,
    label: "Temporary Evacuation Centers",
    metadata: {
      query: {
        template:
          "Name: <b>{{Landmark name (EN)}}</b> | {{Landmark name (JP)}}<br>Category: <b>{{Category}}</b><br>Address: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Temporary Evacuation Centers (Corporate/UR)",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Temporary evacuation center location.",
          swatchStyle: { strokeColor: "#c1272d", strokeWidth: 2 },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: { layerId: "8sbllw5a", layerName: "ihi_evacuation_centers_all-c2o5a5" },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: [
        "in",
        ["get", "Category"],
        ["literal", ["Temp EC (Corporate)", "Temp EC (UR)"]],
      ],
      layout: {
        "icon-size": 0.8,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": [
          "match",
          ["get", "Category"],
          ["Temp EC (Corporate)", "Temp EC (UR)"],
          "ihi_tec",
          "",
        ],
        "text-field": [
          "match",
          ["get", "Category"],
          ["Temp EC (Corporate)", "Temp EC (UR)"],
          ["get", "Landmark name (EN)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 2.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // Evacuation Centers (generic EC)
  {
    id: 18,
    label: "Evacuation Centers",
    metadata: {
      query: {
        template:
          "Name: <b>{{Landmark name (EN)}}</b> | {{Landmark name (JP)}}<br>Category: <b>{{Category}}</b><br>Address: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Evacuation Centers",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "General evacuation center.",
          swatchStyle: { strokeColor: "#c1272d", strokeWidth: 2 },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: { layerId: "8sbllw5a", layerName: "ihi_evacuation_centers_all-c2o5a5" },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "EC"],
      layout: {
        "icon-size": 0.75,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": ["match", ["get", "Category"], "EC", "ihi_ec", ""],
        "text-field": ["match", ["get", "Category"], "EC", ["get", "Landmark name (EN)"], ""],
        "text-anchor": "top",
        "text-offset": [0, 2.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // AED Locations
  {
    id: 3,
    label: "AED Locations",
    metadata: {
      query: {
        template:
          "Name: <b>{{Landmark name (EN)}}</b> | {{Landmark name (JP)}}<br>Category: <b>{{Category}}</b><br>Address: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "AED Locations",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Evacuation support facility with AED.",
          swatchStyle: {
            strokeColor: "#c1272d",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: {
      layerId: "664hckgt",
      layerName: "ihi_evacuation_support_facili-7iemgu",
    },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      layout: {
        "icon-size": 0.6,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": [
          "match",
          ["get", "Category"],
          "AED",
          "ihi_aed",
          "",
        ],
        "text-field": [
          "match",
          ["get", "Category"],
          "AED",
          ["get", "Landmark name (EN)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 1.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // Flood map
  {
    id: 9,
    label: "Flood Depth",
    metadata: {
      query: {
        template: "Flood Depth: <b>{{depth_text}}</b><br>Flood Rank: <b>{{flood_rank}}</b>",
      },
      loadOnInit: true,
      legendItems: [
        {
          label: "Flood Risk Zones",
          swatchType: "fill",
          description: "Flood depth zones from hazard modeling.",
          swatchStyle: {
            fillColor: "#fc0303",
          },
        },
      ],
    },
    layerType: "fill",
    sourceType: "vector",
    sourceData: {
      layerId: "7iw3usti",
      layerName: "ihi_clipped_flood_depth2",
    },
    style: {
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "flood_depth"],
          1,
          "hsl(60, 98%, 90%)",
          2,
          "hsl(37, 98%, 85%)",
          4,
          "hsl(31, 100%, 65%)",
          6,
          "#f98f48",
          8,
          "#fb8783",
          10,
          "#fc0303",
        ],
        "fill-opacity": 0.6,
      },
      layout: {},
    },
  },
  // Bridges
  {
    id: 11,
    label: "Bridges",
    metadata: {
      query: {
        template:
          "Name: <b>{{Landmark name (EN)}}</b> | {{Landmark name (JP)}}<br>Category: <b>{{Category}}</b><br>Address: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Bridges",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "City bridge landmark.",
          swatchStyle: {
            strokeColor: "#377eb8",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: {
      layerId: "6nnqpx91",
      layerName: "ihi_city_landmarks-3au3oa",
    },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "Bridge"],
      layout: {
        "icon-size": 0.6,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": [
          "match",
          ["get", "Category"],
          "Bridge",
          "ihi_bridges",
          "",
        ],
        "text-field": [
          "match",
          ["get", "Category"],
          "Bridge",
          ["get", "Landmark name (EN)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 1.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // Shrines/Temples
  {
    id: 12,
    label: "Shrines/Temples",
    metadata: {
      query: {
        template:
          "Name: <b>{{Landmark name (EN)}}</b> | {{Landmark name (JP)}}<br>Category: <b>{{Category}}</b><br>Address: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Shrines/Temples",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Religious or cultural landmark.",
          swatchStyle: {
            strokeColor: "#377eb8",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: {
      layerId: "6nnqpx91",
      layerName: "ihi_city_landmarks-3au3oa",
    },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "Shrine/Temple"],
      layout: {
        "icon-size": 0.6,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": [
          "match",
          ["get", "Category"],
          "Shrine/Temple",
          "ihi_shrinetemples",
          "",
        ],
        "text-field": [
          "match",
          ["get", "Category"],
          "Shrine/Temple",
          ["get", "Landmark name (EN)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 1.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // Community Centers
  {
    id: 6,
    label: "Community Centers",
    metadata: {
      query: {
        template:
          "Name: <b>{{Landmark name (EN)}}</b> | {{Landmark name (JP)}}<br>Category: <b>{{Category}}</b><br>Address: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Community Centers",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Designated community center facility.",
          swatchStyle: {
            strokeColor: "#c1272d",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: {
      layerId: "664hckgt",
      layerName: "ihi_evacuation_support_facili-7iemgu",
    },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "Community Center"],
      layout: {
        "icon-size": 0.6,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": [
          "match",
          ["get", "Category"],
          "Community Center",
          "ihi_communitycenter",
          "",
        ],
        "text-field": [
          "match",
          ["get", "Category"],
          "Community Center",
          ["get", "Landmark name (EN)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 1.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // Flood Gates
  {
    id: 10,
    label: "Flood Gates",
    metadata: {
      query: {
        template:
          "Name: <b>{{Landmark name (EN)}}</b> | {{Landmark name (JP)}}<br>Category: <b>{{Category}}</b><br>Address: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Flood Gates",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "City flood gate landmark.",
          swatchStyle: {
            strokeColor: "#377eb8",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: {
      layerId: "6nnqpx91",
      layerName: "ihi_city_landmarks-3au3oa",
    },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "Flood Gate"],
      layout: {
        "icon-size": 0.6,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": [
          "match",
          ["get", "Category"],
          "Flood Gate",
          "ihi_floodgates",
          "",
        ],
        "text-field": [
          "match",
          ["get", "Category"],
          "Flood Gate",
          ["get", "Landmark name (EN)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 1.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // Train Stations
  {
    id: 13,
    label: "Train Stations",
    metadata: {
      query: {
        template:
          "Name: <b>{{Landmark name (EN)}}</b> | {{Landmark name (JP)}}<br>Category: <b>{{Category}}</b><br>Address: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Train Stations",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "City rail or metro station.",
          swatchStyle: {
            strokeColor: "#377eb8",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: {
      layerId: "6nnqpx91",
      layerName: "ihi_city_landmarks-3au3oa",
    },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "Train Station"],
      layout: {
        "icon-size": 0.6,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": [
          "match",
          ["get", "Category"],
          "Train Station",
          "ihi_train",
          "",
        ],
        "text-field": [
          "match",
          ["get", "Category"],
          "Train Station",
          ["get", "Landmark name (EN)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 1.5],
        "icon-allow-overlap": true,
      },
    },
  },
];
