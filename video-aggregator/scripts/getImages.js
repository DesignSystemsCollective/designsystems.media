const fs = require("fs");
const path = require("path");
const axios = require("axios");
const matter = require("gray-matter");

const MAX_RETRY_COUNT = 3; // Number of times to retry a failed download
const folderPath = path.join(__dirname, "../../src/content/media/");

// Helper function to download an image with retries
async function downloadImageWithRetry(url, outputFilePath, retryCount = 0) {
  try {
    console.log(`Downloading: ${url}`);
    await downloadImage(url, outputFilePath);
    console.log(`Downloaded: ${url}`);
  } catch (error) {
    if (retryCount < MAX_RETRY_COUNT) {
      // console.error(`Error downloading ${url}: ${error.message}. Retrying...`);
      // Introduce a delay before the next iteration to avoid rate limiting
      await delay(500); // Delay for 1 second (adjust as needed)

      await downloadImageWithRetry(url, outputFilePath, retryCount + 1);
    } else {
      // console.error(`Max retries reached for ${url}.`);
      // Handle the case where max retries are reached (e.g., use fallback image)
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
  // console.log(`Processing: ${filePath}`);

  const markdownContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(markdownContent);

  if (data.image && data.localImages === false) {
    const imageFileName = path.basename(data.image);
    const imageOutputPath = path.join(path.dirname(filePath), imageFileName);

    try {
      // console.log(`Downloading: ${data.image}`);
      await downloadImageWithRetry(data.image, imageOutputPath);
      console.log(`Downloaded: ${data.image}`);
      data.image = `./${imageFileName}`;

      updateMarkdownFile(filePath, data, content);
    } catch (err) {
      console.error(`Error downloading ${data.image}: ${err.message}`);
    }
  }

  if (data.poster && data.localImages === false) {
    const posterFileName = path.basename(data.poster);
    const posterOutputPath = path.join(path.dirname(filePath), posterFileName);

    try {
      // console.log(`Downloading: ${data.poster}`);
      await downloadImageWithRetry(data.poster, posterOutputPath);
      console.log(`Downloaded: ${data.poster}`);
      data.localImages = true;
      data.poster = `./${posterFileName}`;
      updateMarkdownFile(filePath, data, content);
    } catch (err) {
      // Use the fixed fallback image file path
      data.poster = `./hqdefault.jpg`; // Change this to your fallback poster image file path
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

processMarkdownFiles(folderPath);
