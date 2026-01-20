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

const getOutputDir = (): string => {
  if (process.env.NETLIFY || process.env.NODE_ENV === 'production') {
    return path.resolve(process.cwd(), "dist");
  } else {
    return path.resolve(process.cwd(), "public");
  }
};

const OUTPUT_DIR = getOutputDir();
const PUBLIC_DIR = path.resolve(process.cwd(), "public");

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

/**
 * Calculate how many images are needed for a mosaic with offset rows
 * @param canvasWidth - Width of the output image
 * @param canvasHeight - Height of the output image
 * @param desiredRows - Number of rows you want in the final mosaic
 * @param imageRatio - Aspect ratio of source images (width/height), default 16/9
 * @returns Object with columns, rows, totalImages needed
 */
const calculateMosaicLayout = (
  canvasWidth: number,
  canvasHeight: number,
  desiredRows: number,
  imageRatio: number = 16 / 9
): { columns: number; rows: number; totalImages: number; cellWidth: number; cellHeight: number } => {
  // Calculate cell height based on desired rows
  const cellHeight = Math.ceil(canvasHeight / desiredRows);
  
  // Calculate cell width based on 16:9 ratio
  const cellWidth = Math.ceil(cellHeight * imageRatio);
  
  // Calculate how many columns fit across the width
  const columns = Math.ceil(canvasWidth / cellWidth);
  
  // Total base images (without offset consideration)
  const baseImages = columns * desiredRows;
  
  // Calculate offset rows (every other row)
  const offsetRows = Math.floor(desiredRows / 2);
  
  // Total images needed including extra for offset rows
  const totalImages = baseImages + offsetRows;
  
  return {
    columns,
    rows: desiredRows,
    totalImages,
    cellWidth,
    cellHeight
  };
};

// Updated function to apply horizontal offset to alternating rows
const getImagePositions = (
  imageCount: number,
  columns: number,
  cellWidth: number,
  cellHeight: number,
  rowOffset: number = 0
): ImagePosition[] => {
  const positions: ImagePosition[] = [];

  for (let i = 0; i < imageCount; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;

    // Apply offset to every other row (odd rows)
    const horizontalOffset = (row % 2 === 1) ? rowOffset : 0;

    positions.push({
      x: col * cellWidth + horizontalOffset,
      y: row * cellHeight,
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

    await ensureDir(path.join(OUTPUT_DIR, "social"));
    await ensureDir(path.join(PUBLIC_DIR, "social"));

    // Now you just specify the number of ROWS you want!
    const socialImageSpecs = [
      { name: "dsm-linkedin-1200x627.jpg", width: 1200, height: 627, rows: 4 },
      { name: "dsm-bluesky-1000x1000.jpg", width: 1000, height: 1000, rows: 5 },
      { name: "dsm-insta-1080x1350.jpg", width: 1080, height: 1350, rows: 6 }
    ];

    // Calculate max images needed across all specs
    const maxImagesNeeded = Math.max(
      ...socialImageSpecs.map(spec => 
        calculateMosaicLayout(spec.width, spec.height, spec.rows).totalImages
      )
    );
    
    const FETCH_BUFFER = 2;
    const recentPosts: MediaEntry[] = allVideosFilteredAndSorted.slice(0, Math.ceil(maxImagesNeeded * FETCH_BUFFER));
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

    if (validPostImages.length < maxImagesNeeded) {
      console.warn(`[Astro Mosaics] Warning: Only found ${validPostImages.length} valid images, but need ${maxImagesNeeded}. Some mosaics may be incomplete.`);
    }

    const overlayPath = path.join(process.cwd(), "public/DSMoverlay.png");
    try {
      await fs.access(overlayPath);
      console.log("[Astro Mosaics] Found overlay image at:", overlayPath);
    } catch (error) {
      throw new Error("Overlay image not found at: " + overlayPath);
    }

    // Get overlay dimensions for centering
    const overlayMetadata = await sharp(overlayPath).metadata();
    const overlayWidth = overlayMetadata.width || 0;
    const overlayHeight = overlayMetadata.height || 0;

    for (const spec of socialImageSpecs) {
      // Calculate optimal layout based on desired rows
      const layout = calculateMosaicLayout(spec.width, spec.height, spec.rows);
      
      console.log("[Mosaic Creation] Starting mosaic for", spec.name, `(${spec.width}x${spec.height})`);
      console.log(`[Mosaic Creation] Layout: ${layout.columns} columns × ${layout.rows} rows`);
      console.log(`[Mosaic Creation] Cell size: ${layout.cellWidth}×${layout.cellHeight}px`);
      console.log(`[Mosaic Creation] Using ${layout.totalImages} images total`);

      const rowOffset = -Math.floor(layout.cellWidth / 2); // NEGATIVE offset to shift left
      
      const positions = getImagePositions(
        layout.totalImages,
        layout.columns,
        layout.cellWidth,
        layout.cellHeight,
        rowOffset
      );

      const canvas = sharp({
        create: {
          width: spec.width,
          height: spec.height,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      });

      const compositeOperations: CompositeLayer[] = [];

      // Add grid images
      for (let i = 0; i < layout.totalImages && i < validPostImages.length; i++) {
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

      // Add overlay centered
      const overlayLeft = Math.floor((spec.width - overlayWidth) / 2);
      const overlayTop = Math.floor((spec.height - overlayHeight) / 2);
      
      console.log("[Mosaic Creation] Added overlay image: DSMoverlay.png (centered at", overlayLeft, ",", overlayTop, ")");
      compositeOperations.push({
        input: overlayPath,
        top: overlayTop,
        left: overlayLeft
      });

      const finalImage = await canvas
        .composite(compositeOperations)
        .jpeg({ quality: 90 })
        .toBuffer();

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