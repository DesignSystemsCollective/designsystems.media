// Breakpoints
export const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  large: 1440,
} as const;

// Standard width arrays for different image sizes
export const IMAGE_WIDTHS = {
  thumbnail: [70, 140],           // For 70px display
  small: [120, 240],               // For 120px display
  medium: [320, 640],              // For 320px display
  large: [320, 640, 1280],         // For 640px display
  extraLarge: [540, 900, 1440],   // For 900px+ display
  // Podcast artwork specific widths
  podcastSmall: [150, 300],        // For 150px display
  podcastMedium: [200, 400],        // For 200px display
  podcastLarge: [200, 250, 500],   // For 250px display
} as const;

// Standard sizes strings for responsive images
export const IMAGE_SIZES = {
  thumbnail: "70px",
  small: "120px",
  medium: `(max-width: ${BREAKPOINTS.tablet}px) 320px, 640px`,
  large: `(max-width: ${BREAKPOINTS.mobile}px) 320px, (max-width: ${BREAKPOINTS.desktop}px) 640px, 1280px`,
  card: `(max-width: ${BREAKPOINTS.mobile}px) 240px, (max-width: ${BREAKPOINTS.desktop}px) 540px, 900px`,
  artwork: `(max-width: ${BREAKPOINTS.desktop}px) 200px, 320px`,
  // Podcast artwork specific sizes
  podcastSmall: "150px",
  podcastMedium: `(max-width: ${BREAKPOINTS.desktop}px) 150px, 200px`,
  podcastLarge: `(max-width: ${BREAKPOINTS.desktop}px) 200px, 250px`,
} as const;
