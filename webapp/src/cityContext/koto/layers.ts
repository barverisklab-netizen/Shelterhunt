import type { CityLayer } from "@/types/cityLayers";
import { KOTO_GEOJSON_SOURCES } from "@/data/kotoGeojsonSources";
import type { CityLocale, CityMapStyle } from "@/cityContext/types";

export const kotoMapStyle: CityMapStyle = {
  styleUrl: "mapbox://styles/mitfluxmap/cmebgcxpe001001qm0ek1491l",
  fallbackStyleUrl: "mapbox://styles/mapbox/streets-v12",
};

export const kotoLayerGroups = [
  "Shelters",
  "Evacuation Support Facilities",
  "City Landmarks",
  "Hazard Layers",
] as const;

export const kotoSupportedLocales: CityLocale[] = ["en", "ja"];

// Koto, Tokyo Mapbox layer definitions and styling details
export const kotoLayers: CityLayer[] = [
  // Designated Evacuation Centers
  {
    id: 1,
    label: "Designated Evacuation Centers",
    labelJp: "指定避難所",
    group: "Shelters",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.shelterCapacity}}: <b>{{Shelter_Capacity}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
      },
      loadOnInit: true,
      legendItems: [
        {
          label: "Designated Evacuation Centers",
          labelKey: "map.layers.items.1",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Designated evacuation center.",
          descriptionKey: "map.layers.descriptions.1",
          swatchStyle: { strokeColor: "#c1272d", strokeWidth: 2 },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "geojson",
    sourceData: {
      layerId: "8sbllw5a",
      layerName: "ihi_evacuation_centers_all-c2o5a5",
      geojsonUrl: KOTO_GEOJSON_SOURCES.shelters,
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
    labelJp: "自主避難所",
    group: "Shelters",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
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
    sourceType: "geojson",
    sourceData: {
      layerId: "8sbllw5a",
      layerName: "ihi_evacuation_centers_all-c2o5a5",
      geojsonUrl: KOTO_GEOJSON_SOURCES.shelters,
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
        ["literal", ["Voluntary EC", "EC/Voluntary EC"]],
      ],
      layout: {
        "icon-size": 0.8,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": [
          "case",
          [
            "in",
            ["get", "Category"],
            ["literal", ["Voluntary EC", "EC/Voluntary EC"]],
          ],
          "ihi_vec",
          "",
        ],
        "text-field": [
          "case",
          [
            "in",
            ["get", "Category"],
            ["literal", ["Voluntary EC", "EC/Voluntary EC"]],
          ],
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
    labelJp: "一時避難所（企業・UR）",
    group: "Shelters",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
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
    sourceType: "geojson",
    sourceData: {
      layerId: "8sbllw5a",
      layerName: "ihi_evacuation_centers_all-c2o5a5",
      geojsonUrl: KOTO_GEOJSON_SOURCES.shelters,
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
          "case",
          [
            "in",
            ["get", "Category"],
            ["literal", ["Temp EC (Corporate)", "Temp EC (UR)"]],
          ],
          "ihi_tec",
          "",
        ],
        "text-field": [
          "case",
          [
            "in",
            ["get", "Category"],
            ["literal", ["Temp EC (Corporate)", "Temp EC (UR)"]],
          ],
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
    labelJp: "福祉避難所",
    group: "Shelters",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
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
    sourceType: "geojson",
    sourceData: {
      layerId: "8sbllw5a",
      layerName: "ihi_evacuation_centers_all-c2o5a5",
      geojsonUrl: KOTO_GEOJSON_SOURCES.shelters,
    },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "Special Needs Shelter"],
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
    labelJp: "避難所",
    group: "Shelters",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
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
    sourceType: "geojson",
    sourceData: {
      layerId: "8sbllw5a",
      layerName: "ihi_evacuation_centers_all-c2o5a5",
      geojsonUrl: KOTO_GEOJSON_SOURCES.shelters,
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
    labelJp: "AED設置場所",
    group: "Evacuation Support Facilities",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
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
    sourceType: "geojson",
    sourceData: {
      layerId: "664hckgt",
      layerName: "ihi_evacuation_support_facili-7iemgu",
      geojsonUrl: KOTO_GEOJSON_SOURCES.support,
    },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "AED"],
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
    labelJp: "浸水リスクゾーン",
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
  // Inland water depth
  {
    id: 8,
    label: "Inland Waters Depth",
    labelJp: "内水氾濫深",
    group: "Hazard Layers",
    metadata: {
      query: {
        template:
          "{{t:map.popup.inlandWatersDepth}}: <b>{{InlandWaters_Depth}}</b><br>{{t:map.popup.rank}}: <b>{{InlandWaters_Depth_Rank}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Inland Waters Depth",
          labelKey: "map.layers.items.8",
          swatchType: "fill",
          description: "Inland waters depth zones.",
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
  // Flood duration rank
  {
    id: 9,
    label: "Flood Duration Rank",
    labelJp: "浸水継続時間",
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
    labelJp: "高潮浸水深",
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
  // Bridges
  {
    id: 11,
    label: "Bridges",
    labelJp: "橋",
    group: "City Landmarks",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Bridges",
          labelKey: "map.layers.items.11",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "City bridge landmark.",
          descriptionKey: "map.layers.descriptions.11",
          swatchStyle: {
            strokeColor: "#377eb8",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "geojson",
    sourceData: {
      layerId: "6nnqpx91",
      layerName: "ihi_city_landmarks-3au3oa",
      geojsonUrl: KOTO_GEOJSON_SOURCES.landmarks,
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
    id: 12,
    label: "Shrines/Temples",
    labelJp: "神社・寺院",
    group: "City Landmarks",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Shrines/Temples",
          labelKey: "map.layers.items.12",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Religious or cultural landmark.",
          descriptionKey: "map.layers.descriptions.12",
          swatchStyle: {
            strokeColor: "#377eb8",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "geojson",
    sourceData: {
      layerId: "6nnqpx91",
      layerName: "ihi_city_landmarks-3au3oa",
      geojsonUrl: KOTO_GEOJSON_SOURCES.landmarks,
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
    id: 13,
    label: "Community Centers",
    labelJp: "コミュニティセンター",
    group: "Evacuation Support Facilities",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Community Centers",
          labelKey: "map.layers.items.13",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Designated community center facility.",
          descriptionKey: "map.layers.descriptions.13",
          swatchStyle: {
            strokeColor: "#c1272d",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "geojson",
    sourceData: {
      layerId: "664hckgt",
      layerName: "ihi_evacuation_support_facili-7iemgu",
      geojsonUrl: KOTO_GEOJSON_SOURCES.support,
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
  // Water Stations
  {
    id: 14,
    label: "Water Stations",
    labelJp: "給水ステーション",
    group: "Evacuation Support Facilities",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Water Stations",
          labelKey: "map.layers.items.14",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Water supply station landmark.",
          descriptionKey: "map.layers.descriptions.14",
          swatchStyle: {
            strokeColor: "#377eb8",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "geojson",
    sourceData: {
      layerId: "664hckgt",
      layerName: "ihi_evacuation_support_facili-7iemgu",
      geojsonUrl: KOTO_GEOJSON_SOURCES.support,
    },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "Water Station"],
      layout: {
        "icon-size": 0.6,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": [
          "match",
          ["get", "Category"],
          "Water Station",
          "ihi_waterstation",
          "",
        ],
        "text-field": [
          "match",
          ["get", "Category"],
          "Water Station",
          ["get", "Landmark Name (JP)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 1.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // Hospitals
  {
    id: 15,
    label: "Hospitals",
    labelJp: "病院",
    group: "Evacuation Support Facilities",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Hospitals",
          labelKey: "map.layers.items.15",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Hospital or medical facility landmark.",
          descriptionKey: "map.layers.descriptions.15",
          swatchStyle: {
            strokeColor: "#377eb8",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "geojson",
    sourceData: {
      layerId: "664hckgt",
      layerName: "ihi_evacuation_support_facili-7iemgu",
      geojsonUrl: KOTO_GEOJSON_SOURCES.support,
    },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "Hospital"],
      layout: {
        "icon-size": 0.6,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": [
          "match",
          ["get", "Category"],
          "Hospital",
          "ihi_hospital",
          "",
        ],
        "text-field": [
          "match",
          ["get", "Category"],
          "Hospital",
          ["get", "Landmark Name (JP)"],
          "",
        ],
        "text-anchor": "top",
        "text-offset": [0, 1.5],
        "icon-allow-overlap": true,
      },
    },
  },
  // Emergency Supply Storage
  {
    id: 16,
    label: "Emergency Supply Storage",
    labelJp: "防災備蓄倉庫",
    group: "Evacuation Support Facilities",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Emergency Supply Storage",
          labelKey: "map.layers.items.16",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "Emergency supply storage facility.",
          descriptionKey: "map.layers.descriptions.16",
          swatchStyle: {
            strokeColor: "#377eb8",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "geojson",
    sourceData: {
      layerId: "664hckgt",
      layerName: "ihi_evacuation_support_facili-7iemgu",
      geojsonUrl: KOTO_GEOJSON_SOURCES.support,
    },
    style: {
      paint: {
        "text-color": "#000000",
        "text-halo-blur": 0.5,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
      filter: ["==", ["get", "Category"], "Emergency Supply Storage"],
      layout: {
        "icon-size": 0.6,
        "text-font": ["Roboto Bold"],
        "text-size": 10,
        "icon-image": [
          "match",
          ["get", "Category"],
          "Emergency Supply Storage",
          "ihi_bosaistorage",
          "",
        ],
        "text-field": [
          "match",
          ["get", "Category"],
          "Emergency Supply Storage",
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
    id: 17,
    label: "Flood Gates",
    labelJp: "水門",
    group: "City Landmarks",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Flood Gates",
          labelKey: "map.layers.items.17",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "City flood gate landmark.",
          descriptionKey: "map.layers.descriptions.17",
          swatchStyle: {
            strokeColor: "#377eb8",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "geojson",
    sourceData: {
      layerId: "6nnqpx91",
      layerName: "ihi_city_landmarks-3au3oa",
      geojsonUrl: KOTO_GEOJSON_SOURCES.landmarks,
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
    id: 18,
    label: "Train Stations",
    labelJp: "駅",
    group: "City Landmarks",
    metadata: {
      query: {
        template:
          "{{t:map.popup.name}}: <b>{{locale:Landmark Name (EN)|Landmark Name (JP)}}</b><br>{{t:map.popup.category}}: <b>{{locale:Category|Category (JP)}}</b><br>{{t:map.popup.address}}: <b>{{locale:Address (EN)|Address (JP)}}</b>",
      },
      loadOnInit: false,
      legendItems: [
        {
          label: "Train Stations",
          labelKey: "map.layers.items.18",
          isActive: true,
          isEnabled: true,
          swatchType: "line",
          description: "City rail or metro station.",
          descriptionKey: "map.layers.descriptions.18",
          swatchStyle: {
            strokeColor: "#377eb8",
            strokeWidth: 2,
          },
        },
      ],
    },
    layerType: "symbol",
    sourceType: "geojson",
    sourceData: {
      layerId: "6nnqpx91",
      layerName: "ihi_city_landmarks-3au3oa",
      geojsonUrl: KOTO_GEOJSON_SOURCES.landmarks,
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
