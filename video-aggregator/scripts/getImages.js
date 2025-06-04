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

  // If localImages is already true, skip downloading.
  if (data.localImages === true) {
    return;
  }

  // Define the desired new filename for the downloaded image
  const newPosterFileName = "poster.jpg";
  const posterOutputPath = path.join(path.dirname(filePath), newPosterFileName);

  // Check if data.poster exists and localImages is false
  if (data.poster) {
    try {
      console.log(`Attempting to download poster: ${data.poster}`);
      await downloadImageWithRetry(data.poster, posterOutputPath);
      console.log(`Successfully downloaded poster: ${data.poster}`);

      // Update both 'image' and 'poster' to point to the newly downloaded 'poster.jpg'
      data.image = `./${newPosterFileName}`;
      data.poster = `./${newPosterFileName}`;
      data.localImages = true; // Mark as locally handled

      updateMarkdownFile(filePath, data, content);
    } catch (err) {
      // Fallback in case of download error for poster
      data.image = `./hqdefault.jpg`; // You might also want a specific fallback for 'image'
      data.poster = `./hqdefault.jpg`;
      console.error(
        `Error downloading poster image "${data.poster}": ${err.message}. Manually set as: ${data.poster}`
      );
      data.localImages = true; // Still mark as local even if using fallback
      updateMarkdownFile(filePath, data, content);
    }
  } else {
    // If data.poster doesn't exist but data.image does, we can still attempt to download 'image'
    // and rename it to poster.jpg, then set both to that.
    if (data.image) {
      try {
        console.log(`Poster not found, attempting to download image as poster: ${data.image}`);
        await downloadImageWithRetry(data.image, posterOutputPath);
        console.log(`Successfully downloaded image as poster: ${data.image}`);

        data.image = `./${newPosterFileName}`;
        data.poster = `./${newPosterFileName}`;
        data.localImages = true;
        updateMarkdownFile(filePath, data, content);
      } catch (err) {
        console.error(`Error downloading image for poster fallback "${data.image}": ${err.message}.`);
        // Fallback for both if image download also fails
        data.image = `./hqdefault.jpg`;
        data.poster = `./hqdefault.jpg`;
        data.localImages = true;
        updateMarkdownFile(filePath, data, content);
      }
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