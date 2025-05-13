import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const MEDIA_DIR = path.join("media");

function parseDuration(durationStr) {
  const parts = durationStr.split(":").map(Number).reverse();
  const seconds = parts[0] + (parts[1] || 0) * 60 + (parts[2] || 0) * 3600;
  return seconds;
}

async function processDirectories() {
  const entries = await fs.readdir(MEDIA_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dirPath = path.join(MEDIA_DIR, entry.name);
    const mdxPath = path.join(dirPath, "index.mdx");

    try {
      const fileContent = await fs.readFile(mdxPath, "utf8");
      const { data } = matter(fileContent);

      if (data.duration) {
        const totalSeconds = parseDuration(data.duration);

        if (totalSeconds <= 60) {
          console.log(`Deleting: ${dirPath} (duration: ${data.duration})`);
          await fs.rm(dirPath, { recursive: true, force: true });
        }
      } else {
        console.warn(`No duration found in ${mdxPath}`);
      }
    } catch (err) {
      console.error(`Error processing ${mdxPath}:`, err.message);
    }
  }
}

processDirectories();
