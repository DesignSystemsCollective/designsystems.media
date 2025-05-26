import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { allPostsFilteredAndSorted } from "./mediaCollection";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, "../../public");

const ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }
};

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Creates an offset mosaic with optional centered overlay image and text
 *
 * @param {string[]} imagePaths - Array of full file system paths to your 16:9 source images
 * @param {string} outputPath - Full file system path to save the final mosaic image
 * @param {number} finalWidth - Desired final width of the mosaic in pixels
 * @param {number} finalHeight - Desired final height of the mosaic in pixels
 * @param {number} preferredTileWidth - The preferred width for each individual thumbnail tile
 * @param {number | null} [fixedRows=null] - Optional: exact number of visible rows
 * @param {number | null} [fixedCols=null] - Optional: exact number of visible columns
 * @param {Object} [overlayOptions=null] - Optional overlay configuration
 * @param {string} [overlayOptions.imagePath] - Path to overlay image
 * @param {number} [overlayOptions.width] - Width of overlay image
 * @param {number} [overlayOptions.height] - Height of overlay image
 * @param {number} [overlayOptions.opacity=1] - Opacity of overlay (0-1)
 * @param {Object} [textOptions=null] - Optional text configuration
 * @param {string} [textOptions.text] - Text to display
 * @param {number} [textOptions.fontSize=48] - Font size in pixels
 * @param {string} [textOptions.fontFamily='Arial'] - Font family
 * @param {string} [textOptions.color='white'] - Text color
 * @param {string} [textOptions.strokeColor='black'] - Stroke color for outline
 * @param {number} [textOptions.strokeWidth=2] - Stroke width for outline
 * @param {number} [textOptions.offsetY=0] - Vertical offset from center
 */
async function createOffsetMosaic(
  imagePaths,
  outputPath,
  finalWidth,
  finalHeight,
  preferredTileWidth,
  fixedRows = null,
  fixedCols = null,
  overlayOptions = null,
  textOptions = null
) {
  if (imagePaths.length === 0) {
    console.warn(
      `[Mosaic Creation] No images provided for ${path.basename(
        outputPath
      )}. Skipping.`
    );
    return;
  }
  console.log(
    `[Mosaic Creation] Starting offset mosaic for ${path.basename(
      outputPath
    )} (${finalWidth}x${finalHeight}) using ${imagePaths.length} images...`
  );

  const ASPECT_RATIO = 16 / 9;
  const compositeOperations = [];
  const horizontalOverlap = 0;
  const verticalOverlap = 0;

  let actualBaseTileWidth;
  let actualBaseTileHeight;
  let colsToLayOut;
  let rowsToLayOut;

  // Calculate tile dimensions based on constraints
  if (fixedRows !== null && fixedRows > 0) {
    actualBaseTileHeight = Math.round(finalHeight / fixedRows);
    actualBaseTileWidth = Math.round(actualBaseTileHeight * ASPECT_RATIO);
    rowsToLayOut = fixedRows;
    colsToLayOut = Math.ceil(finalWidth / actualBaseTileWidth);
  } else if (fixedCols !== null && fixedCols > 0) {
    actualBaseTileWidth = Math.round(finalWidth / fixedCols);
    actualBaseTileHeight = Math.round(actualBaseTileWidth / ASPECT_RATIO);
    colsToLayOut = fixedCols;
    rowsToLayOut = Math.ceil(finalHeight / actualBaseTileHeight);
  } else {
    actualBaseTileWidth = Math.round(preferredTileWidth);
    actualBaseTileHeight = Math.round(actualBaseTileWidth / ASPECT_RATIO);
    colsToLayOut = Math.ceil(finalWidth / actualBaseTileWidth);
    rowsToLayOut = Math.ceil(finalHeight / actualBaseTileHeight);
  }

  const actualEffectiveTileWidth = actualBaseTileWidth;
  const actualEffectiveTileHeight = actualBaseTileHeight;
  const bufferX = actualBaseTileWidth;
  const bufferY = actualBaseTileHeight;

  const imagesForThisMosaic = shuffleArray([...imagePaths]);
  let imageIndex = 0;

  // Create mosaic tiles
  for (let row = 0; row < rowsToLayOut + 2; row++) {
    for (let col = 0; col < colsToLayOut + 2; col++) {
      if (imageIndex >= imagesForThisMosaic.length) {
        imageIndex = 0;
      }
      const currentImagePath = imagesForThisMosaic[imageIndex];

      let x = col * actualEffectiveTileWidth;
      let y = row * actualEffectiveTileHeight;

      if (row % 2 !== 0) {
        x += actualBaseTileWidth / 2;
      }

      x -= bufferX;
      y -= bufferY;

      try {
        const resizedImageBuffer = await sharp(currentImagePath)
          .resize(actualBaseTileWidth, actualBaseTileHeight, {
            fit: "cover",
            position: "center",
          })
          .toBuffer();

        compositeOperations.push({
          input: resizedImageBuffer,
          left: Math.round(x),
          top: Math.round(y),
        });
      } catch (imageProcessingError) {
        console.error(
          `[Mosaic Creation] Error processing individual image "${currentImagePath}":`,
          imageProcessingError.message
        );
      }
      imageIndex++;
    }
  }

  if (compositeOperations.length === 0) {
    console.error(
      `[Mosaic Creation] No valid images were successfully processed for compositing for ${path.basename(
        outputPath
      )}. Cannot create mosaic.`
    );
    return;
  }

  // Calculate bounds and create intermediate canvas
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const op of compositeOperations) {
    minX = Math.min(minX, op.left);
    minY = Math.min(minY, op.top);
    maxX = Math.max(maxX, op.left + actualBaseTileWidth);
    maxY = Math.max(maxY, op.top + actualBaseTileHeight);
  }

  const calculatedIntermediateWidth = maxX - minX;
  const calculatedIntermediateHeight = maxY - minY;
  const requiredExtractWidth = finalWidth + 2 * bufferX;
  const requiredExtractHeight = finalHeight + 2 * bufferY;
  const intermediateCanvasWidth = Math.max(
    calculatedIntermediateWidth,
    requiredExtractWidth
  );
  const intermediateCanvasHeight = Math.max(
    calculatedIntermediateHeight,
    requiredExtractHeight
  );

  if (intermediateCanvasWidth <= 0 || intermediateCanvasHeight <= 0) {
    console.error(
      `[Mosaic Creation] Calculated intermediate canvas dimensions are invalid for ${path.basename(
        outputPath
      )}`
    );
    return;
  }

  const adjustedCompositeOperations = compositeOperations.map((op) => ({
    ...op,
    left: op.left - minX,
    top: op.top - minY,
  }));

  try {
    await ensureDir(PUBLIC_DIR);

    // Create the base mosaic without overlay
    let mosaicPipeline = sharp({
      create: {
        width: intermediateCanvasWidth,
        height: intermediateCanvasHeight,
        channels: 4,
        background: { r: 240, g: 240, b: 240, alpha: 1 },
      },
    }).composite(adjustedCompositeOperations);

    // Create intermediate image and extract to final dimensions first
    const intermediateImage = await mosaicPipeline.png().toBuffer();

    // Extract to final size
    let finalImage = await sharp(intermediateImage)
      .extract({
        left: Math.round(bufferX),
        top: Math.round(bufferY),
        width: finalWidth,
        height: finalHeight,
      })
      .toBuffer();

    // NOW add overlay to the final-sized image
    if (overlayOptions && overlayOptions.imagePath) {
      try {
        await fs.access(overlayOptions.imagePath);

        const overlayBuffer = await sharp(overlayOptions.imagePath)
          .resize(overlayOptions.width, overlayOptions.height, {
            fit: "contain",
            position: "center",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toBuffer();

        // Calculate center position on final image
        const overlayLeft = Math.round((finalWidth - overlayOptions.width) / 2);
        const overlayTop = Math.round(
          (finalHeight - overlayOptions.height) / 2
        );

        finalImage = await sharp(finalImage)
          .composite([
            {
              input: overlayBuffer,
              left: overlayLeft,
              top: overlayTop,
              blend: "over",
            },
          ])
          .toBuffer();

        console.log(
          `[Mosaic Creation] Added overlay image: ${path.basename(
            overlayOptions.imagePath
          )}`
        );
      } catch (error) {
        console.warn(
          `[Mosaic Creation] Warning: Could not load overlay image at ${overlayOptions.imagePath}:`,
          error.message
        );
      }
    }

    // Create final pipeline from the processed buffer
    let finalPipeline = sharp(finalImage);

    // Add text overlay if specified
    if (textOptions && textOptions.text) {
      const {
        text,
        fontSize = 48,
        fontFamily = "Arial",
        color = "white",
        strokeColor = "black",
        strokeWidth = 2,
        offsetY = 0,
      } = textOptions;

      // Create SVG text with stroke
      const textSvg = `
                <svg width="${finalWidth}" height="${finalHeight}">
                    <text 
                        x="50%" 
                        y="${50 + (offsetY / finalHeight) * 100}%" 
                        text-anchor="middle" 
                        dominant-baseline="middle"
                        font-family="${fontFamily}" 
                        font-size="${fontSize}px" 
                        fill="${color}"
                        stroke="${strokeColor}"
                        stroke-width="${strokeWidth}px"
                        paint-order="stroke fill"
                        font-weight="bold"
                    >${text}</text>
                </svg>
            `;

      const textBuffer = Buffer.from(textSvg);

      finalPipeline = finalPipeline.composite([
        {
          input: textBuffer,
          left: 0,
          top: 0,
        },
      ]);

      console.log(`[Mosaic Creation] Added text overlay: "${text}"`);
    }

    await finalPipeline.jpeg({ quality: 85 }).toFile(outputPath);

    console.log(
      `[Mosaic Creation] Successfully composed mosaic to: ${outputPath}`
    );
  } catch (error) {
    console.error(
      `[Mosaic Creation] Error during mosaic creation for ${path.basename(
        outputPath
      )}:`,
      error
    );
    throw error;
  }
}

// Updated orchestrator function with overlay and text examples
export async function runAllMosaics() {
  console.log(
    "[Astro Mosaics] Fetching most recent posts from Astro content collection..."
  );

  const allPosts = allPostsFilteredAndSorted;
  const sortedPosts = allPosts.sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime()
  );

  const recentPostImagePaths = [];
  const maxImagesToPull = 35;

  for (const post of sortedPosts.slice(0, maxImagesToPull)) {
    let absoluteImagePathForSharp;
    const targetImageFileName = "maxresdefault.jpg";
    const postContentBasePath = path.join(process.cwd(), "src/content/media");
    const absolutePostDir = path.dirname(
      path.join(postContentBasePath, post.id)
    );
    absoluteImagePathForSharp = path.join(absolutePostDir, targetImageFileName);

    try {
      await fs.access(absoluteImagePathForSharp);
      recentPostImagePaths.push(absoluteImagePathForSharp);
    } catch (error) {
      console.warn(
        `[Astro Mosaics] Warning: Image file not found at path: ${absoluteImagePathForSharp} for post "${post.data.title}". Skipping.`
      );
    }
  }

  if (recentPostImagePaths.length < 15) {
    console.error(
      `[Astro Mosaics] ERROR: Only found ${recentPostImagePaths.length} recent post images suitable for mosaics.`
    );
    throw new Error(
      "Not enough source images to generate mosaics. Build failed."
    );
  }

  console.log(
    `[Astro Mosaics] Found ${recentPostImagePaths.length} valid recent post images.`
  );

  const SOCIAL_OUTPUT_DIR = path.join(PUBLIC_DIR, "social");
  await ensureDir(SOCIAL_OUTPUT_DIR);

  // In Astro build context, public folder is at same level as the page
  const possibleOverlayPaths = [
    path.resolve("./public/DSMoverlay.png"), // Direct relative path
    path.join(process.cwd(), "public", "DSMoverlay.png"), // From project root
    "./public/DSMoverlay.png", // Simple relative path
    path.resolve("public/DSMoverlay.png"), // Alternative resolve
  ];

  let overlayPath = null;
  for (const testPath of possibleOverlayPaths) {
    try {
      await fs.access(testPath);
      overlayPath = testPath;
      console.log(`[Astro Mosaics] Found overlay image at: ${overlayPath}`);
      break;
    } catch (error) {
      // Continue to next path
    }
  }

  if (!overlayPath) {
    console.warn(
      `[Astro Mosaics] Warning: Could not find DSMoverlay.png in any of these locations:`
    );
    possibleOverlayPaths.forEach((p) => console.warn(`  - ${p}`));
    console.warn(`[Astro Mosaics] Continuing without overlay image...`);
  }

  // LinkedIn mosaic - 1200x627 (ratio ~1.91:1)
  await createOffsetMosaic(
    recentPostImagePaths.slice(0, Math.min(recentPostImagePaths.length, 22)),
    path.join(SOCIAL_OUTPUT_DIR, "dsm-linkedin-1200x627.jpg"),
    1200,
    627,
    270,
    3,
    null,
    overlayPath
      ? {
          imagePath: overlayPath,
          width: 627,
          height: 627,
          opacity: 1,
        }
      : null
  );

  // Square mosaic - 1000x1000 (ratio 1:1)
  await createOffsetMosaic(
    recentPostImagePaths.slice(0, Math.min(recentPostImagePaths.length, 25)),
    path.join(SOCIAL_OUTPUT_DIR, "dsm-bluesky-1000x1000.jpg"),
    1000,
    1000,
    280,
    4,
    null,
    overlayPath
      ? {
          imagePath: overlayPath,
          width: 627,
          height: 627,
          opacity: 1,
        }
      : null
  );

  // Tall/Portrait mosaic - 1080x1350 (ratio 4:5)
  await createOffsetMosaic(
    recentPostImagePaths.slice(0, Math.min(recentPostImagePaths.length, 28)),
    path.join(SOCIAL_OUTPUT_DIR, "dsm-insta-1080x1350.jpg"),
    1080,
    1350,
    380,
    5,
    null,
    overlayPath
      ? {
          imagePath: overlayPath,
          width: 627,
          height: 627,
          opacity: 1,
        }
      : null
  );

  console.log("[Astro Mosaics] All requested social media mosaics generated!");
}
