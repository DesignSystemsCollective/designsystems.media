const fs = require("fs");
const path = require("path");
const axios = require("axios");
const matter = require("gray-matter");

const MAX_RETRY_COUNT = 3; // Number of times to retry a failed download

// Define your two hardcoded folder paths in an array
const folderPaths = [
  path.join(__dirname, "../../src/content/media/"),
  path.join(__dirname, "../../src/content/podcasts"),
];

// Helper function to download an image with retries
async function downloadImageWithRetry(url, outputFilePath, retryCount = 0) {
  try {
    console.log(`Downloading: ${url}`);
    await downloadImage(url, outputFilePath);
    console.log(`Downloaded: ${url}`);
  } catch (error) {
    if (retryCount < MAX_RETRY_COUNT) {
      await delay(500); // Delay for 500 milliseconds before retrying
      await downloadImageWithRetry(url, outputFilePath, retryCount + 1);
    } else {
      throw error;
    }
  }
}

// Helper function to download an image
function downloadImage(url, outputFilePath) {
  return axios({
    method: "get",
    url,
    responseType: "stream",
  }).then((response) => {
    return new Promise((resolve, reject) => {
      const stream = response.data.pipe(fs.createWriteStream(outputFilePath));
      stream.on("finish", () => resolve());
      stream.on("error", (error) => reject(error));
    });
  });
}

// Function to process the Markdown file with error handling and delays
async function processMarkdownFile(filePath) {
  const markdownContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(markdownContent);

  // Define the desired new filename
  const newFileName = "poster.jpg";

  if (data.image && data.localImages === false) {
    // Construct the output path with the new desired filename
    const imageOutputPath = path.join(path.dirname(filePath), newFileName);

    try {
      await downloadImageWithRetry(data.image, imageOutputPath);
      // Update the markdown file's front matter to reflect the new local path
      data.image = `./${newFileName}`;
      updateMarkdownFile(filePath, data, content);
    } catch (err) {
      console.error(`Error downloading ${data.image}: ${err.message}`);
    }
  }

  if (data.poster && data.localImages === false) {
    // Construct the output path with the new desired filename
    const posterOutputPath = path.join(path.dirname(filePath), newFileName);

    try {
      await downloadImageWithRetry(data.poster, posterOutputPath);
      data.localImages = true;
      // Update the markdown file's front matter to reflect the new local path
      data.poster = `./${newFileName}`;
      updateMarkdownFile(filePath, data, content);
    } catch (err) {
      data.poster = `./hqdefault.jpg`; // Fallback in case of download error
      console.error(
        `Error downloading poster, manually set as: ${data.poster}`
      );
      data.localImages = true;
      updateMarkdownFile(filePath, data, content);
    }
  }
}

// Helper function to introduce a delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to update the Markdown file with new front matter and content
function updateMarkdownFile(filePath, data, content) {
  const updatedFrontMatter = Object.entries(data)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");

  const updatedMarkdown = `---\n${updatedFrontMatter}\n---\n${content}`;
  fs.writeFileSync(filePath, updatedMarkdown);
}

// Function to recursively process Markdown files in a directory
function processMarkdownFiles(directory) {
  const files = fs.readdirSync(directory);

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      processMarkdownFiles(filePath);
    } else if (path.extname(file) === ".mdx") {
      processMarkdownFile(filePath);
    }
  });
}

// Loop through each hardcoded folder path and process files
folderPaths.forEach((folderPath) => {
  console.log(`Processing files in: ${folderPath}`);
  processMarkdownFiles(folderPath);
});