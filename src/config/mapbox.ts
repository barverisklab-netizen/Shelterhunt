// Mapbox Configuration
// Update this with your actual Mapbox username to enable Koto layers

export const MAPBOX_CONFIG = {
  // Your Mapbox username - get this from your Mapbox account
  // Example: if your Mapbox Studio URL is "https://studio.mapbox.com/tilesets/myusername.abc123"
  // then your username is "myusername"
  username: 'YOUR_MAPBOX_USERNAME', // ⚠️ CHANGE THIS to your actual Mapbox username
  
  // Access token is loaded from environment variable (already configured)
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN as string,
  
  // Tileset IDs from your Koto layers
  tilesets: {
    evacuation: '664hckgt',           // AED Locations & Community Centers
    landmarks: '6nnqpx91',            // Bridges, Shrines, Flood Gates, Train Stations
    floodDepth: '7iw3usti'            // Flood Depth zones
  }
};

// Helper function to get tileset URL
export function getTilesetUrl(tilesetId: string): string {
  return `mapbox://${MAPBOX_CONFIG.username}.${tilesetId}`;
}
