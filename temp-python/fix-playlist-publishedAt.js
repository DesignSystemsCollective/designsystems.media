const fs = require("fs");
const path = require("path");

const jsonFilePath =
  "/Users/josh.harwood/Documents/GitHub/design-systems-video-aggregator/temp-python/TODO-REPLACE-PUBLISHEDDATES-IN-PLAYLISTS.json";

// Load the JSON data.
const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf-8"));
console.log(`Start`);

const markdownDirectory =
  "/Users/josh.harwood/Documents/GitHub/design-systems-video-aggregator/src/content/media";

// Recursive function to scan for Markdown files in subdirectories
function scanForMarkdownFiles(directory) {
  const files = fs.readdirSync(directory);
  files.forEach((file) => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanForMarkdownFiles(fullPath); // If it's a directory, continue scanning
    } else if (file.endsWith(".mdx")) {
      // If it's an .mdx file, process it
      const markdownContent = fs.readFileSync(fullPath, "utf-8");

      const match = markdownContent.match(
        /^videoUrl:\s+"(https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]+))"/m
      );

      if (match) {
        const videoUrl = match[1];
        const videoId = match[2];

        const item = jsonData.items.find(
          (item) => item.contentDetails.videoId === videoId
        );

        if (item) {
          const updatedMarkdownContent = markdownContent.replace(
            /^publishedAt:\s+".*"/m,
            `publishedAt: "${item.contentDetails.videoPublishedAt}"`
          );
          fs.writeFileSync(fullPath, updatedMarkdownContent, "utf-8");
          console.log(
            `Updated "${fullPath}" with videoPublishedAt: ${item.contentDetails.videoPublishedAt}`
          );
        }
      }
    }
  });
}

scanForMarkdownFiles(markdownDirectory);
console.log(`End`);
