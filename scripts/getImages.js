const fs = require("fs");
const path = require("path");
const axios = require("axios");
const matter = require("gray-matter");

const MAX_RETRY_COUNT = 3; // Number of times to retry a failed download
const folderPath = "src/content/media"; // Updated folder path

// Helper function to download an image with retries
async function downloadImageWithRetry(url, outputFilePath, retryCount = 0) {
  try {
    console.log(`Downloading: ${url}`);
    await downloadImage(url, outputFilePath);
    console.log(`Downloaded: ${url}`);
  } catch (error) {
    if (retryCount < MAX_RETRY_COUNT) {
      console.error(`Error downloading ${url}: ${error.message}. Retrying...`);
      await downloadImageWithRetry(url, outputFilePath, retryCount + 1);
    } else {
      console.error(`Max retries reached for ${url}. Fallback or skip.`);
      // Handle the case where max retries are reached (e.g., use fallback image)
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

// Function to process the Markdown file with error handling and fallbacks
function processMarkdownFile(filePath) {
  console.log(`Processing: ${filePath}`);

  const markdownContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(markdownContent);

  if (data.image && data.localImages === false) {
    const imageFileName = path.basename(data.image);
    const imageOutputPath = path.join(path.dirname(filePath), imageFileName);

    downloadImageWithRetry(data.image, imageOutputPath)
      .then(() => {
        data.localImages = true;
        data.image = `./${imageFileName}`;
        updateMarkdownFile(filePath, data, content);
      })
      .catch((err) => {
        console.error(`Error downloading ${data.image}: ${err.message}`);
        data.localImages = true;
        data.poster = `./hqdefault.jpg`;
        updateMarkdownFile(filePath, data, content);
        // Handle the case where the image download fails (e.g., use fallback image)
        // Example: data.image = `./fallback.jpg`;
        // Then update the Markdown file as shown in the updateMarkdownFile function
      });
  }

  if (data.poster && data.localImages === false) {
    const posterFileName = path.basename(data.poster);
    const posterOutputPath = path.join(path.dirname(filePath), posterFileName);

    downloadImageWithRetry(data.poster, posterOutputPath)
      .then(() => {
        data.localImages = true;
        data.poster = `./${posterFileName}`;
        updateMarkdownFile(filePath, data, content);
      })
      .catch((err) => {
        console.error(`Error downloading ${data.poster}: ${err.message}`);
        data.localImages = true;
        data.poster = `./hqdefault.jpg`;
        updateMarkdownFile(filePath, data, content);
        // Handle the case where the poster download fails (e.g., use fallback image)
        // Example: data.poster = `./fallback_poster.jpg`;
        // Then update the Markdown file as shown in the updateMarkdownFile function
      });
  }
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
