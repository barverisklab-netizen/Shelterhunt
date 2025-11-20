# Mapbox Setup Instructions

The map now uses Mapbox GL JS for real interactive mapping with multiple layers.

## Getting Your Mapbox Access Token

1. Go to [https://account.mapbox.com/](https://account.mapbox.com/)
2. Sign up for a free account (or log in if you have one)
3. Navigate to your [Access Tokens page](https://account.mapbox.com/access-tokens/)
4. Copy your default public token (or create a new one)
5. Replace the placeholder token in `/components/MapView.tsx` on line 9:

```typescript
mapboxgl.accessToken = 'YOUR_ACTUAL_TOKEN_HERE';
```

## Map Features

The map includes the following layers:

- **Flood Hazard Zones**: Color-coded polygons showing high (red), medium (orange), and low (yellow) risk areas
- **Shelters**: Purple markers for emergency shelters
- **Schools**: Yellow markers for schools
- **Fire Stations**: Red markers for fire stations
- **Hospitals**: Blue markers for hospitals
- **Parks**: Green markers for parks
- **Libraries**: Cyan markers for libraries

## Layer Controls

Click the layers icon in the top-left corner of the map to toggle different layers on/off.

## Map Style

The map uses Mapbox's dark theme (`mapbox://styles/mapbox/dark-v11`) to match the glassmorphism design.

## Free Tier Limits

Mapbox's free tier includes:
- 50,000 free map loads per month
- 100,000 free requests per month
- Perfect for testing and development
