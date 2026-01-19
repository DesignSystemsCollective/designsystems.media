import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { allVideosFilteredAndSorted } from "./mediaCollection";
import type { MediaEntry } from "../types/media";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MosaicDimensions {
  width: number;
  height: number;
}

interface MosaicImage {
  width: number;
  height: number;
  buffer: Buffer;
}

interface CompositeLayer {
  input: Buffer | string;
  top: number;
  left: number;
}

// Fix: Use proper output directory for Astro builds
const getOutputDir = (): string => {
  // Check if we're in a build environment
  if (process.env.NETLIFY || process.env.NODE_ENV === 'production') {
    // In production/Netlify, use dist directory
    return path.resolve(process.cwd(), "dist");
  } else {
    // In development, use public directory
    return path.resolve(process.cwd(), "public");
  }
};

const OUTPUT_DIR = getOutputDir();
const PUBLIC_DIR = path.resolve(process.cwd(), "public"); // Always use public for duplicates

const ensureDir = async (dirPath: string): Promise<void> => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }
};

interface ImagePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const getImagePositions = (
  imageCount: number, 
  canvasWidth: number, 
  canvasHeight: number, 
  offsetX: number = 0, 
  offsetY: number = 0
): ImagePosition[] => {
  const positions: ImagePosition[] = [];
  const columns = Math.ceil(Math.sqrt(imageCount));
  const rows = Math.ceil(imageCount / columns);

  const cellWidth = Math.ceil(canvasWidth / columns);
  const cellHeight = Math.ceil(canvasHeight / rows);

  for (let i = 0; i < imageCount; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;

    positions.push({
      x: col * cellWidth + offsetX,
      y: row * cellHeight + offsetY,
      width: cellWidth,
      height: cellHeight,
    });
  }

  return positions;
};

export const runAllMosaics = async (): Promise<void> => {
  try {
    console.log("[Astro Mosaics] Fetching most recent posts from Astro content collection...");
    console.log("[Astro Mosaics] Primary output directory:", OUTPUT_DIR);
    console.log("[Astro Mosaics] Duplicate output directory:", PUBLIC_DIR);

    // Prepare output directories
    await ensureDir(path.join(OUTPUT_DIR, "social"));
    await ensureDir(path.join(PUBLIC_DIR, "social"));


    // Social image dimensions
    const socialImageSpecs = [
      { name: "dsm-linkedin-1200x627.jpg", width: 1200, height: 627, imageCount: 22 },
      { name: "dsm-bluesky-1000x1000.jpg", width: 1000, height: 1000, imageCount: 25 },
      { name: "dsm-insta-1080x1350.jpg", width: 1080, height: 1350, imageCount: 28 }
    ];

    // Get video thumbnails for the mosaic
const IMAGES_NEEDED = Math.max(...socialImageSpecs.map(spec => spec.imageCount));
const FETCH_BUFFER = 5; // Fetch 50% more to be safe
const recentPosts: MediaEntry[] = allVideosFilteredAndSorted.slice(0, Math.ceil(IMAGES_NEEDED * FETCH_BUFFER));
    const validPostImages: string[] = [];

    for (const post of recentPosts) {
      const imagePath = path.join(process.cwd(), "src/content/media", post.slug, "maxresdefault.jpg");
      try {
        await fs.access(imagePath);
        validPostImages.push(imagePath);
      } catch (error) {
        console.log("[Astro Mosaics] Warning: Image file not found at path:", imagePath, "for post", `"${post.data.title}"`, ". Skipping.");
      }
    }

    console.log("[Astro Mosaics] Found", validPostImages.length, "valid recent post images.");

        if (validPostImages.length < IMAGES_NEEDED) {
  console.warn(`[Astro Mosaics] Warning: Only found ${validPostImages.length} valid images, but need ${IMAGES_NEEDED}. Some mosaics may be incomplete.`);
}

    // Load overlay image
    const overlayPath = path.join(process.cwd(), "public/DSMoverlay.png");
    try {
      await fs.access(overlayPath);
      console.log("[Astro Mosaics] Found overlay image at:", overlayPath);
    } catch (error) {
      throw new Error("Overlay image not found at: " + overlayPath);
    }


    // Create each social image variant
    for (const spec of socialImageSpecs) {
      console.log("[Mosaic Creation] Starting offset mosaic for", spec.name, `(${spec.width}x${spec.height})`, "using", spec.imageCount, "images...");

      // Calculate image positions for the grid
      const positions = getImagePositions(spec.imageCount, spec.width, spec.height);

      // Create base canvas
      const canvas = sharp({
        create: {
          width: spec.width,
          height: spec.height,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      });

      // Prepare composite operations for images
      const compositeOperations: CompositeLayer[] = [];

      // Add grid images
      for (let i = 0; i < spec.imageCount && i < validPostImages.length; i++) {
        const pos = positions[i];
        const resizedImage = await sharp(validPostImages[i])
          .resize(pos.width, pos.height, { fit: "cover" })
          .toBuffer();

        compositeOperations.push({
          input: resizedImage,
          top: pos.y,
          left: pos.x
        });
      }

      // Add overlay
      console.log("[Mosaic Creation] Added overlay image: DSMoverlay.png");
      compositeOperations.push({
        input: overlayPath,
        top: 0,
        left: 0
      });

      // Composite all layers
      const finalImage = await canvas
        .composite(compositeOperations)
        .jpeg({ quality: 90 })
        .toBuffer();

      // Save to both output directories
      const primaryPath = path.join(OUTPUT_DIR, "social", spec.name);
      const duplicatePath = path.join(PUBLIC_DIR, "social", spec.name);

      await fs.writeFile(primaryPath, finalImage);
      console.log("[Mosaic Creation] Successfully composed mosaic to:", primaryPath);

      await fs.writeFile(duplicatePath, finalImage);
      console.log("[Mosaic Creation] Successfully created duplicate at:", duplicatePath);
    }

    console.log("[Astro Mosaics] All requested social media mosaics generated!");
    console.log("[Astro Mosaics] Duplicates saved to public/social/ folder!");

  } catch (error) {
    console.error("[Astro Mosaics] Error generating mosaics:", error);
    throw error;
  }
};
