# Secret Shelter - Location-Based Deduction Game

## Overview
Secret Shelter is an interactive location-based deduction game where players race against time to find a secret emergency shelter before a hurricane hits. Players visit Points of Interest (POIs), answer trivia questions to gather clues, and use deduction to identify the correct shelter location.

**Original Figma Design**: https://www.figma.com/design/88OH71ZYHpnLVTbdIvkO8T/Location-Based-Deduction-Game

## Current State
- **Status**: Fully functional frontend application
- **Last Updated**: October 28, 2025
- **Framework**: React 18.3.1 with Vite 6.3.5
- **UI Library**: Radix UI components with Tailwind CSS
- **Map Provider**: Mapbox GL JS

## Project Architecture

### Tech Stack
- **Frontend**: React + TypeScript
- **Build Tool**: Vite with SWC
- **Styling**: Tailwind CSS with glassmorphism design
- **UI Components**: Radix UI primitives
- **Maps**: Mapbox GL JS
- **State Management**: React hooks (useState, useEffect)
- **Animations**: Motion (Framer Motion)
- **Notifications**: Sonner toast library

### Project Structure
```
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components (Radix-based)
│   │   ├── figma/           # Figma-specific components
│   │   ├── OnboardingScreen.tsx  # Landing page
│   │   ├── WaitingRoom.tsx       # Multiplayer lobby
│   │   ├── GameScreen.tsx        # Main game interface
│   │   ├── MapView.tsx           # Mapbox integration
│   │   ├── GameplayPanel.tsx     # Gameplay controls & intel
│   │   ├── QuestionDrawer.tsx    # Question interface
│   │   ├── TriviaModal.tsx       # Trivia questions
│   │   └── HelpModal.tsx         # Game instructions
│   ├── config/
│   │   └── mapbox.ts             # Mapbox configuration (username, tilesets)
│   ├── data/
│   │   ├── gameContent.ts        # Default questions, trivia, and player data
│   │   └── cityContext.ts        # City-specific configuration
│   ├── cityContext/
│   │   └── koto/
│   │       └── layers.ts         # Koto layer data for Koto, Tokyo
│   ├── types/
│   │   └── kotoLayers.ts         # Koto layer type definitions
│   ├── styles/
│   │   └── globals.css           # Global styles and Tailwind config
│   ├── App.tsx                   # Main app component
│   └── main.tsx                  # Entry point
├── vite.config.ts                # Vite configuration
├── package.json                  # Dependencies
└── index.html                    # HTML template
```

### Game Features
1. **Multiple Game Modes**:
   - Solo Play
   - Join Game (multiplayer)
   - Host Multiplayer

2. **Gameplay Mechanics**:
   - 30-minute timer countdown
   - Visit POIs on an interactive map
   - Answer trivia questions to unlock clues
   - Deduce the secret shelter location
   - Submit final guess

3. **Map Layers**:
   - Flood hazard zones (high/medium/low risk)
   - Emergency shelters
   - Schools, fire stations, hospitals
   - Parks and libraries

## Development Setup

### Environment
- **Port**: 5000 (frontend server)
- **Host**: 0.0.0.0 (required for Replit proxy)


## Environment variables

- Commit `.env.example` (no secrets).
- Do NOT commit `.env.local`. This file is ignored by git and is for local secrets (e.g. Mapbox token).

Restart the dev server after changing env files:
```bash
npm run dev
```

### Running the Project
```bash
npm install
npm run dev
```

The development server will start on `http://0.0.0.0:5000`

### Building for Production
```bash
npm run build
```
Output directory: `build/`

## Mapbox Configuration
The application uses Mapbox GL JS for interactive mapping with a dark basemap style.

**Token Setup**:
- The Mapbox token is stored in Replit Secrets as `MAPBOX_TOKEN`
- Accessed in code via `import.meta.env.VITE_MAPBOX_TOKEN`
- Environment variables must be prefixed with `VITE_` to be accessible in the browser

**Map Configuration**:
- Map style, starting location, and zoom levels are defined in `src/data/cityContext.ts`
- Current basemap: `mapbox://styles/mapbox/dark-v11`
- Starting location: Koto, Tokyo (35.6731°N, 139.8171°E)
- Zoom range: 12-18

**Note**: The free tier includes 50,000 map loads/month - perfect for testing.

## Configuring Koto Layers

The application is set up to display Koto, Tokyo-specific layers, but requires Mapbox tileset configuration to show actual data.

### What's Already Implemented:
- ✅ Layer definitions with styles, filters, and click handlers
- ✅ Toggle functionality in the MapView component
- ✅ Click-to-query popups showing feature information
- ✅ Legend showing all available layers

### What You Need to Do:

1. **Mapbox Username Already Configured**:
   - Username is set to `mitfluxmap` in `src/config/mapbox.ts`
   - No changes needed unless you want to use a different account

2. **Upload Vector Tiles to Mapbox Studio** (if not already done):
   - Go to https://studio.mapbox.com/tilesets/
   - Upload your vector tile data for each layer (GeoJSON, MBTiles, etc.)
   - Make sure the tileset IDs match these values:
     - `664hckgt`: AED Locations & Community Centers (source layer: `ihi_evacuation_support_facili-7iemgu`)
     - `6nnqpx91`: Bridges, Shrines/Temples, Flood Gates, Train Stations (source layer: `ihi_city_landmarks-3au3oa`)
     - `7iw3usti`: Flood Depth data (source layer: `ihi_clipped_flood_depth2`)

3. **Test the Layers**:
   - Check the browser console for confirmation: "Mapbox username configured: mitfluxmap"
   - Once tilesets are uploaded, the 404 errors will disappear
   - Use the layer toggle button (top-left) to show/hide layers
   - Click on features to see popup information

## Recent Changes
- **October 28, 2025 (Latest Update - Fully Dynamic Layer System)**: 
  - ✅ **Fully Dynamic Legend**
    - Legend now completely generated from `kotoLayers` data - no hardcoded values
    - Automatically iterates through `legendItems` array for each layer
    - Swatch colors pulled from `legendItems.swatchStyle` (strokeColor or fillColor)
    - Labels use `legendItems.label` instead of hardcoded strings
    - Swatch shapes determined by `swatchType` (symbol/line = circle, fill = square)
    - Adding new layers to `src/cityContext/koto/layers.ts` automatically updates legend
    
  - ✅ **Enhanced Layer Toggle System**
    - Layer toggles dynamically generated from `kotoLayers` array data
    - Icons mapped to layer IDs (e.g., Bridges=11, Community Centers=6, AED=3, etc.)
    - Icon colors extracted from `legendItems.swatchStyle` for visual consistency
    - Toggle menu shows all 7 Koto layers with correct styling
    
  - ✅ **Improved Feature Popups**
    - Popups now display layer information from `legendItems` (label + description)
    - Feature-specific data formatted using query template from layer metadata
    - Enhanced popup styling with dark glass background
    - Each popup shows: Layer name → Layer description → Feature details
    
  - ✅ **Basemap Configuration**
    - Map now uses basemap URL from city context instead of hardcoded value
    - Single source of truth: change basemap in `src/data/cityContext.ts`
    - Easy to customize per city or switch between Mapbox styles

- **October 28, 2025 (Koto, Tokyo Integration)**: 
  - ✅ **Changed location from Boston to Koto, Tokyo, Japan**
    - Map center: 35.6731°N, 139.8171°E
    - Updated all POIs to Koto-specific locations (Koto Fire Station, Ariake Community Center, etc.)
    - Secret shelter: Ariake Community Center
  
  - ✅ **Integrated Koto, Tokyo Mapbox Layers**
    - Created layer type definitions in `src/types/kotoLayers.ts`
    - Implemented 7 Koto-specific layers:
      - **Layer ID 3 - AED Locations**: Evacuation support facilities with AED (red #c1272d)
      - **Layer ID 6 - Community Centers**: Designated community facilities (cyan #00FFFF)
      - **Layer ID 9 - Flood Depth**: Color-coded flood risk zones 1m to 10m+ depth (multi-color)
      - **Layer ID 10 - Flood Gates**: City flood control infrastructure (indigo #0008ff)
      - **Layer ID 11 - Bridges**: City bridge landmarks (blue #0000FF)
      - **Layer ID 12 - Shrines/Temples**: Religious and cultural landmarks (purple #800080)
      - **Layer ID 13 - Train Stations**: Rail and metro stations (green #00FF00)
    - Added click-to-query functionality with enhanced popups
    - Layers toggleable via MapView component with dynamic icons
    - All styling (colors, filters, paint properties) sourced from `kotoLayers` data
    
  - ⚠️ **Note**: Layers require Mapbox tileset configuration to display data
    - Tilesets need to be uploaded to Mapbox Studio
    - See "Configuring Koto Layers" section below for instructions

- **October 28, 2025 (Earlier Updates)**: 
  - ✅ Fixed map rendering issue (container height was 0px, now properly sized)
  - ✅ Implemented full-screen map display with no rounded corners
  - ✅ Added game title "Secret Shelter" to top bar
  - ✅ Made legend minimizable and positioned above bottom bar
  - ✅ Added exit button to return to main menu
  - ✅ **Reworked "Ask a Question" feature**:
    - Created city context system (`src/data/cityContext.ts`)
    - Questions now organized by categories (Location Details, Facility Type, Nearby Amenities, Capacity & Resources)
    - Categories are defined in city context JSON and can be customized per city
    - User selects a category first, then sees questions within that category
    - Map configuration (basemap URL, start location, zoom levels) now loaded from city context
  - ✅ Added mock location selector:
    - Click navigation button to enter location picker mode
    - Click anywhere on map to teleport player to that location
    - Useful for testing without physically moving

- **October 28, 2025**: Initial Replit setup
  - Configured Vite for Replit environment (port 5000, host 0.0.0.0)
  - Added `allowedHosts: true` to Vite config for Replit's dynamic proxy hostnames
  - Set up development workflow on port 5000
  - Configured deployment for autoscale with build and preview commands
  - Integrated Mapbox GL JS with dark-v11 style using MAPBOX_TOKEN secret
  - Created .gitignore for Node.js project
  - Created comprehensive replit.md documentation

## User Preferences
None configured yet.

## Dependencies
All dependencies are managed via npm and defined in `package.json`. Key libraries:
- React ecosystem (react, react-dom)
- Radix UI component primitives
- Mapbox GL JS for mapping
- Motion for animations
- Tailwind CSS for styling
- Sonner for notifications

## City Context System
The game uses a city context configuration to customize the experience for different cities:

### Configuration Structure (`src/data/cityContext.ts`)
```typescript
{
  cityName: string;
  mapConfig: {
    basemapUrl: string;        // Mapbox style URL
    startLocation: { lat, lng };
    minZoom: number;
    maxZoom: number;
  };
  questionCategories: [
    {
      id: string;              // Category ID (location, facility, nearby, capacity)
      name: string;            // Display name
      description: string;     // Category description
      icon: string;            // Icon name (MapPin, Home, Radar, Users)
    }
  ]
}
```

### Adding a New City
1. Create a new city context object in `src/data/cityContext.ts`
2. Define the map configuration (basemap, starting location, zoom levels)
3. Specify which question categories are available for this city
4. Update `src/App.tsx` to use the new city context

## Notes
- The application currently uses mock data for POIs, questions, and players
- Multiplayer functionality is simulated (not real-time)
- The game state is managed entirely client-side
- Question categories filter which questions are available based on the city context
- LSP warnings about module imports are expected due to version-specific aliases in vite.config.ts
