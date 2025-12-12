import { KotoLayer } from "@/types/kotoLayers";

// Koto, Tokyo Mapbox layer definitions and styling details
export const kotoLayers: KotoLayer[] = [
  // Designated Evacuation Centers
  {
    id: 1,
    label: "Designated Evacuation Centers",
    group: "Shelters",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.categoryJp}}: <b>{{Category (JP)}}</b><br>{{t:map.popup.shelterCapacity}}: <b>{{Shelter_Capacity}}</b><br>{{t:map.popup.address}}: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: true,
      legendItems: [
        {
          label: "Designated Evacuation Centers",
          labelKey: "map.layers.items.1",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Government-designated evacuation center.",
          descriptionKey: "map.layers.descriptions.1",
          swatchStyle: { strokeColor: "#c1272d", strokeWidth: 2 },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: {
      layerId: "8sbllw5a",
      layerName: "ihi_evacuation_centers_all-c2o5a5",
    },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "Designated EC"],
      layout: {
        "icon-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          0.35,
          14,
          0.65,
          18,
          1,
        ],
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": [
          "match",
          ["get", "Category"],
          "Designated EC",
          "ihi_dec",
          "",
        ],
        "text-field": [
          "match",
          ["get", "Category"],
          "Designated EC",
          ["get", "Landmark Name (JP)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 2.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // Voluntary Evacuation Centers
  {
    id: 2,
    label: "Voluntary Evacuation Centers",
    group: "Shelters",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{Category}}</b><br>{{t:map.popup.address}}: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Voluntary Evacuation Centers",
          labelKey: "map.layers.items.2",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Voluntary evacuation center.",
          descriptionKey: "map.layers.descriptions.2",
          swatchStyle: { strokeColor: "#c1272d", strokeWidth: 2 },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: {
      layerId: "8sbllw5a",
      layerName: "ihi_evacuation_centers_all-c2o5a5",
    },
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
        "icon-image": [
          "match",
          ["get", "Category"],
          "Voluntary EC",
          "ihi_vec",
          "",
        ],
        "text-field": [
          "match",
          ["get", "Category"],
          "Voluntary EC",
          ["get", "Landmark Name (JP)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 1.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // Temporary Evacuation Centers (Corporate/UR)
  {
    id: 3,
    label: "Temporary Evacuation Centers",
    group: "Shelters",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark name (EN)|Landmark name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{Category}}</b><br>{{t:map.popup.address}}: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Temporary Evacuation Centers (Corporate/UR)",
          labelKey: "map.layers.items.3",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Temporary evacuation center location.",
          descriptionKey: "map.layers.descriptions.3",
          swatchStyle: { strokeColor: "#c1272d", strokeWidth: 2 },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: {
      layerId: "8sbllw5a",
      layerName: "ihi_evacuation_centers_all-c2o5a5",
    },
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
          ["get", "Landmark Name (JP)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 2.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // Special Needs Evacuation Centers ()
  {
    id: 4,
    label: "Special Needs Evacuation Centers",
    group: "Shelters",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{Category}}</b><br>{{t:map.popup.address}}: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Special Needs Shelter",
          labelKey: "map.layers.items.4",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Special needs shelter location.",
          descriptionKey: "map.layers.descriptions.4",
          swatchStyle: { strokeColor: "#c1272d", strokeWidth: 2 },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: {
      layerId: "8sbllw5a",
      layerName: "ihi_evacuation_centers_all-c2o5a5",
    },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: [
        "in",
        ["get", "Category"], "Special Needs Shelter"
      ],
      layout: {
        "icon-size": 0.8,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": [
          "match",
          ["get", "Category"],"Special Needs Shelter",
          "ihi_snec",
          "",
        ],
        "text-field": [
          "match",
          ["get", "Category"],"Special Needs Shelter",
          ["get", "Landmark Name (JP)"],
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
    id: 5,
    label: "Evacuation Centers",
    group: "Shelters",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark name (EN)|Landmark name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{Category}}</b><br>{{t:map.popup.address}}: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Evacuation Centers",
          labelKey: "map.layers.items.5",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "General evacuation center.",
          descriptionKey: "map.layers.descriptions.5",
          swatchStyle: { strokeColor: "#c1272d", strokeWidth: 2 },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "vector",
    sourceData: {
      layerId: "8sbllw5a",
      layerName: "ihi_evacuation_centers_all-c2o5a5",
    },
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
        "text-field": [
          "match",
          ["get", "Category"],
          "EC",
          ["get", "Landmark Name (JP)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 2.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // AED Locations
  {
    id: 6,
    label: "AED Locations",
    group: "Evacuation Support Facilities",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark name (EN)|Landmark name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{Category}}</b><br>{{t:map.popup.address}}: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "AED Locations",
          labelKey: "map.layers.items.6",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Evacuation support facility with AED.",
          descriptionKey: "map.layers.descriptions.6",
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
        "icon-image": ["match", ["get", "Category"], "AED", "ihi_aed", ""],
        "text-field": [
          "match",
          ["get", "Category"],
          "AED",
          ["get", "Landmark Name (JP)"],
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
    id: 7,
    label: "Flood Depth",
    group: "Hazard Layers",
    metadata: {
      query: {
        template:
          "{{t:map.popup.floodDepth}}: <b>{{depth_text}}</b><br>{{t:map.popup.floodRank}}: <b>{{flood_rank}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Flood Risk Zones",
          labelKey: "map.layers.items.7",
          swatchType: "fill",
          description: "Flood depth zones from hazard modeling.",
          descriptionKey: "map.layers.descriptions.7",
          swatchStyle: {
            fillColor: "#fc0303",
          },
          isActive: true,
          isEnabled: true,
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
  // Flood depth rank
  {
    id: 8,
    label: "Inland Waters Depth Rank",
    group: "Hazard Layers",
    metadata: {
      query: {
        template:
          "{{t:map.popup.inlandWatersDepth}}: <b>{{InlandWaters_Depth}}</b><br>{{t:map.popup.rank}}: <b>{{InlandWaters_Depth_Rank}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Inland Waters Depth Rank",
          labelKey: "map.layers.items.8",
          swatchType: "fill",
          description: "Ranked inland waters depth zones.",
          descriptionKey: "map.layers.descriptions.8",
          swatchStyle: {
            fillColor: "#2a79b9",
          },
          isActive: true,
          isEnabled: true,
        },
      ],
    },
    layerType: "fill",
    sourceType: "vector",
    sourceData: {
      layerId: "5m35xdxx",
      layerName: "ihi_inlandwaters_depth-armcon",
    },
    style: {
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "InlandWaters_Depth_Rank"],
          1,
          "#f7fbfe",
          2,
          "#8EB7D8",
          3,
          "#2a79b9",
          4,
          "#1C5482",
        ],
        "fill-opacity": 0.6,
      },
      layout: {},
    },
  },
  // Flood duration rank
  {
    id: 9,
    label: "Flood Duration Rank",
    group: "Hazard Layers",
    metadata: {
      query: {
        template:
          "{{t:map.popup.floodDuration}}: <b>{{Flood_Duration}}</b><br>{{t:map.popup.rank}}: <b>{{Flood_Duration_Rank}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Flood Duration Rank",
          labelKey: "map.layers.items.9",
          swatchType: "fill",
          description: "Ranked flood duration zones.",
          descriptionKey: "map.layers.descriptions.9",
          swatchStyle: {
            fillColor: "#6a52a2",
          },
          isActive: false,
          isEnabled: true,
        },
      ],
    },
    layerType: "fill",
    sourceType: "vector",
    sourceData: {
      layerId: "7o06y51k",
      layerName: "ihi_flood_duration-56uczi",
    },
    style: {
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "Flood_Duration_Rank"],
          1,
          "#fcfcfd",
          2,
          "#dddbec",
          3,
          "#a39fca",
          6,
          "#6a52a2",
        ],
        "fill-opacity": 0.6,
      },
      layout: {},
    },
  },
  // Stormsurge
  {
    id: 10,
    label: "Storm Surge",
    group: "Hazard Layers",
    metadata: {
      query: {
        template:
          "{{t:map.popup.stormSurgeDepth}}: <b>{{StormSurge_Depth}}</b><br>{{t:map.popup.rank}}: <b>{{StormSurge_Depth_Rank}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Storm Surge Depth Rank",
          labelKey: "map.layers.items.10",
          swatchType: "fill",
          description: "Ranked storm surge depth zones.",
          descriptionKey: "map.layers.descriptions.10",
          swatchStyle: {
            fillColor: "#be4f27",
          },
          isActive: false,
          isEnabled: true,
        },
      ],
    },
    layerType: "fill",
    sourceType: "vector",
    sourceData: {
      layerId: "96ah6eu6",
      layerName: "ihi_stormsurge-3wwpzg",
    },
    style: {
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "StormSurge_Depth_Rank"],
          1,
          "#fcfad5",
          2,
          "#fde8ab",
          3,
          "#ffd081",
          4,
          "#faaa47",
          5,
          "#f28721",
          6,
          "#dd6826",
          7,
          "#be4f27",
        ],
        "fill-opacity": 0.6,
      },
      layout: {},
    },
  },
  // Inland water depth
  {
    id: 11,
    label: "Inland Waters Depth",
    group: "Hazard Layers",
    metadata: {
      query: {
        template:
          "{{t:map.popup.inlandWatersDepth}}: <b>{{InlandWaters_Depth}}</b><br>{{t:map.popup.rank}}: <b>{{InlandWaters_Depth_Rank}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Inland Waters Depth Rank",
          labelKey: "map.layers.items.11",
          swatchType: "fill",
          description: "Ranked inland waters depth zones.",
          descriptionKey: "map.layers.descriptions.11",
          swatchStyle: {
            fillColor: "#2a79b9",
          },
          isActive: true,
          isEnabled: true,
        },
      ],
    },
    layerType: "fill",
    sourceType: "vector",
    sourceData: {
      layerId: "5m35xdxx",
      layerName: "ihi_inlandwaters_depth-armcon",
    },
    style: {
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "InlandWaters_Depth_Rank"],
          1,
          "#B3DCFE",
          2,
          "#80BCEC",
          3,
          "#2E83C9",
          4,
          "#1A4A71",
        ],
        "fill-opacity": 0.6,
      },
      layout: {},
    },
  },
  // Bridges
  {
    id: 12,
    label: "Bridges",
    group: "City Landmarks",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark name (EN)|Landmark name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{Category}}</b><br>{{t:map.popup.address}}: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Bridges",
          labelKey: "map.layers.items.12",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "City bridge landmark.",
          descriptionKey: "map.layers.descriptions.12",
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
          ["get", "Landmark Name (JP)"],
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
    id: 13,
    label: "Shrines/Temples",
    group: "City Landmarks",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark name (EN)|Landmark name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{Category}}</b><br>{{t:map.popup.address}}: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Shrines/Temples",
          labelKey: "map.layers.items.13",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Religious or cultural landmark.",
          descriptionKey: "map.layers.descriptions.13",
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
          ["get", "Landmark Name (JP)"],
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
    id: 14,
    label: "Community Centers",
    group: "Evacuation Support Facilities",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark name (EN)|Landmark name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{Category}}</b><br>{{t:map.popup.address}}: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Community Centers",
          labelKey: "map.layers.items.14",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Designated community center facility.",
          descriptionKey: "map.layers.descriptions.14",
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
          ["get", "Landmark Name (JP)"],
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
    id: 15,
    label: "Flood Gates",
    group: "City Landmarks",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark name (EN)|Landmark name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{Category}}</b><br>{{t:map.popup.address}}: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Flood Gates",
          labelKey: "map.layers.items.15",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "City flood gate landmark.",
          descriptionKey: "map.layers.descriptions.15",
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
          ["get", "Landmark Name (JP)"],
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
    id: 16,
    label: "Train Stations",
    group: "City Landmarks",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark name (EN)|Landmark name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{Category}}</b><br>{{t:map.popup.address}}: <b>{{Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Train Stations",
          labelKey: "map.layers.items.16",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "City rail or metro station.",
          descriptionKey: "map.layers.descriptions.16",
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
          ["get", "Landmark Name (JP)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 1.5],
        "icon-allow-overlap": true,
      },
    },
  },
];
