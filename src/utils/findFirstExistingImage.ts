import fs from "fs/promises";
import path from "path";

// poster.jpg is the only filename the current pipeline ever produces (see
// video-aggregator/scripts/getImages.js); maxresdefault.jpg and hqdefault.jpg
// are legacy artifacts from an older pipeline that always co-occur with
// poster.jpg in this repo (verified: 0 folders have either legacy file
// without poster.jpg). They're kept here only as a last-resort fallback, not
// because they should ever win.
export const IMAGE_FILENAME_PRIORITY = ["poster.jpg", "maxresdefault.jpg", "hqdefault.jpg"];

// Returns the absolute path of the first filename (in priority order) that
// exists in baseDir, or null if none of them do.
export const findFirstExistingImage = async (
  baseDir: string,
  filenames: string[] = IMAGE_FILENAME_PRIORITY,
): Promise<string | null> => {
  for (const filename of filenames) {
    const imagePath = path.join(baseDir, filename);
    try {
      await fs.access(imagePath);
      return imagePath;
    } catch (error) {
      // Continue to next filename
    }
  }
  return null;
};
