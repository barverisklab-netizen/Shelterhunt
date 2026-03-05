// Mapbox configuration is environment-driven.
// Do not hardcode tokens or usernames in source.

const readEnv = (key: "VITE_MAPBOX_USERNAME" | "VITE_MAPBOX_TOKEN" | "VITE_MAPBOX_STYLE_URL") => {
  const value = import.meta.env?.[key];
  return typeof value === "string" ? value.trim() : "";
};

export const MAPBOX_CONFIG = {
  // Mapbox username for tileset lookups (required when vector sources are used)
  username: readEnv("VITE_MAPBOX_USERNAME"),

  // Access token must come from environment
  accessToken: readEnv("VITE_MAPBOX_TOKEN"),

  // Optional: style URL override
  styleUrl: readEnv("VITE_MAPBOX_STYLE_URL"),

  // Tileset IDs from your Koto layers
  tilesets: {
    evacuation: "664hckgt", // AED Locations & Community Centers
    landmarks: "6nnqpx91", // Bridges, Shrines, Flood Gates, Train Stations
    floodDepth: "7iw3usti", // Flood Depth zones
  },
};

// Helper function to get tileset URL
export function getTilesetUrl(tilesetId: string): string {
  if (!MAPBOX_CONFIG.username) {
    throw new Error("Missing VITE_MAPBOX_USERNAME for Mapbox tileset URL resolution.");
  }
  return `mapbox://${MAPBOX_CONFIG.username}.${tilesetId}`;
}
