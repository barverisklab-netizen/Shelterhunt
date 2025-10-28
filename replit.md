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
│   │   ├── CluesPanel.tsx        # Clue management
│   │   ├── QuestionDrawer.tsx    # Question interface
│   │   ├── TriviaModal.tsx       # Trivia questions
│   │   └── HelpModal.tsx         # Game instructions
│   ├── data/
│   │   └── mockData.ts           # Game data (POIs, questions, etc.)
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
The application uses Mapbox GL JS for interactive mapping. To use your own Mapbox token:

1. Sign up at https://account.mapbox.com/
2. Get your access token from https://account.mapbox.com/access-tokens/
3. Update the token in `src/components/MapView.tsx` (line 9)

**Note**: The free tier includes 50,000 map loads/month - perfect for testing.

See `src/MAPBOX_SETUP.md` for detailed instructions.

## Recent Changes
- **October 28, 2025**: Initial Replit setup
  - Configured Vite for Replit environment (port 5000, host 0.0.0.0)
  - Set up development workflow
  - Verified application functionality
  - Created .gitignore for Node.js project

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

## Notes
- The application currently uses mock data for POIs, questions, and players
- Multiplayer functionality is simulated (not real-time)
- The game state is managed entirely client-side
- LSP warnings about module imports are expected due to version-specific aliases in vite.config.ts
