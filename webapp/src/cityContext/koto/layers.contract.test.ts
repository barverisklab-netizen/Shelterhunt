import { describe, expect, it } from "vitest";
import { kotoLayers, kotoMapStyle, kotoSupportedLocales } from "./layers";

describe("koto layer contracts", () => {
  it("has unique ids and labels", () => {
    const ids = kotoLayers.map((layer) => layer.id);
    const labels = kotoLayers.map((layer) => layer.label);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("has valid source requirements by sourceType", () => {
    kotoLayers.forEach((layer) => {
      if (layer.sourceType === "geojson") {
        expect(layer.sourceData.geojsonUrl, `missing geojsonUrl for ${layer.label}`).toBeTruthy();
      }

      if (layer.sourceType === "vector") {
        expect(layer.sourceData.layerName, `missing layerName for ${layer.label}`).toBeTruthy();
      }
    });
  });

  it("defines metadata and style for all layers", () => {
    kotoLayers.forEach((layer) => {
      expect(layer.metadata.query.template, `missing query template for ${layer.label}`).toBeTruthy();
      expect(layer.metadata.legendItems.length, `missing legend items for ${layer.label}`).toBeGreaterThan(0);
      expect(layer.style.layout, `missing layout object for ${layer.label}`).toBeTruthy();
      expect(layer.style.paint, `missing paint object for ${layer.label}`).toBeTruthy();
      expect(
        Object.keys(layer.style.paint).length + Object.keys(layer.style.layout).length,
        `empty style for ${layer.label}`,
      ).toBeGreaterThan(0);
      if (layer.layerType === "symbol") {
        expect(Object.keys(layer.style.layout).length, `symbol layer should define layout for ${layer.label}`).toBeGreaterThan(0);
      }
    });
  });

  it("keeps designated evacuation centers layer present and enabled on init", () => {
    const designated = kotoLayers.find(
      (layer) => /Designated Evacuation Centers/i.test(layer.label),
    );
    expect(designated).toBeDefined();
    expect(designated?.metadata.loadOnInit).toBe(true);
    expect(designated?.layerType).toBe("symbol");
  });

  it("defines map style contract", () => {
    expect(kotoMapStyle.styleUrl).toBeTruthy();
  });

  it("defines supported locales for this city", () => {
    expect(kotoSupportedLocales.length).toBeGreaterThan(0);
    expect(new Set(kotoSupportedLocales).size).toBe(kotoSupportedLocales.length);
  });
});
