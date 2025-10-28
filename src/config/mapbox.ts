// Mapbox Configuration
// Update this with your actual Mapbox username to enable Koto layers

export const MAPBOX_CONFIG = {
  // Mapbox username for Koto layer tilesets
  username: "mitfluxmap",

  // Access token is loaded from environment variable (already configured)
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN as string,

  // Tileset IDs from your Koto layers
  tilesets: {
    evacuation: "664hckgt", // AED Locations & Community Centers
    landmarks: "6nnqpx91", // Bridges, Shrines, Flood Gates, Train Stations
    floodDepth: "7iw3usti", // Flood Depth zones
  },
};

// Helper function to get tileset URL
export function getTilesetUrl(tilesetId: string): string {
  return `mapbox://${MAPBOX_CONFIG.username}.${tilesetId}`;
}
