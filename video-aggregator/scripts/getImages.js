const fs = require("fs");
const path = require("path");
const axios = require("axios");
const matter = require("gray-matter");

const MAX_RETRY_COUNT = 3; // Number of times to retry a failed download

// Define your folder paths
const folderPaths = [
  path.join(__dirname, "../../src/content/media/"),
  path.join(__dirname, "../../src/content/podcast/"),
  path.join(__dirname, "../../src/content/show/"), // New show folder
];

// Helper function to download an image with retries
async function downloadImageWithRetry(url, outputFilePath, retryCount = 0) {
  try {
   // console.log(`Downloading: ${url}`);
    await downloadImage(url, outputFilePath);
    //console.log(`Downloaded: ${url}`);
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

// Function to process show Markdown files
async function processShowMarkdownFile(filePath) {
  const markdownContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(markdownContent);

  // If localImages is already true, skip downloading.
  if (data.localImages === true) {
    return;
  }

  // Define the desired new filename for the downloaded image
  const newPosterFileName = "poster.jpg";
  const posterOutputPath = path.join(path.dirname(filePath), newPosterFileName);

  // Check if data.image exists and localImages is false
  if (data.image && data.title) {
    try {
      // console.log(`Attempting to download show image: ${data.image}`);
      await downloadImageWithRetry(data.image, posterOutputPath);
      console.log(`✅ ${data.title}`);

      // Update image reference to local file
      data.image = `./${newPosterFileName}`;
      data.localImages = true; // Mark as locally handled

      updateMarkdownFile(filePath, data, content);
    } catch (err) {
      // Fallback in case of download error
      data.image = `./hqdefault.jpg`;
      console.error(
        `Error downloading show image "${data.image}": ${err.message}. Manually set as: ${data.image}`
      );
      data.localImages = true; // Still mark as local even if using fallback
      updateMarkdownFile(filePath, data, content);
    }
  }
}

// Function to process episode Markdown files
async function processEpisodeMarkdownFile(filePath) {
  const markdownContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(markdownContent);

  // If localImages is already true, skip processing.
  if (data.localImages === true) {
    return;
  }

  // Check if this episode has a custom episode image
  if (data.hasEpisodeImage && data.image && data.title && !data.image.startsWith('../show/')) {
    // This episode has its own custom image, download it
    const newPosterFileName = "poster.jpg";
    const posterOutputPath = path.join(path.dirname(filePath), newPosterFileName);

    try {
     // console.log(`Attempting to download episode-specific image: ${data.image}`);
      await downloadImageWithRetry(data.image, posterOutputPath);
      console.log(`✅ ${data.title}`);

      // Update image reference to local file
      data.image = `./${newPosterFileName}`;
      data.localImages = true;

      updateMarkdownFile(filePath, data, content);
    } catch (err) {
      // Fallback to show image reference if episode image download fails
      console.error(`Error downloading episode image "${data.image}": ${err.message}. Falling back to show image.`);
      
      if (data.showSlug) {
        data.image = `../show/${data.showSlug}/poster.jpg`;
      } else {
        data.image = `./hqdefault.jpg`;
      }
      
      data.localImages = true;
      data.hasEpisodeImage = false; // Mark that we're not using episode-specific image
      updateMarkdownFile(filePath, data, content);
    }
  } else {
    // This episode uses show image or already has correct reference
    // Just mark as processed if it references a show image
    if (data.image && (data.image.startsWith('../show/') || data.showSlug)) {
      data.localImages = true;
      
      // Ensure the image path is correctly formatted
      if (data.showSlug && !data.image.startsWith('../show/')) {
        data.image = `../show/${data.showSlug}/poster.jpg`;
      }
      
      updateMarkdownFile(filePath, data, content);
      console.log(`Episode references show image: ${data.image}`);
    }
  }
}

// Function to process the Markdown file with error handling and delays (legacy support)
async function processMarkdownFile(filePath) {
  const markdownContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(markdownContent);

  // Check if this is a show or episode based on type field or path
  if (data.type === "show" || filePath.includes("/show/")) {
    return await processShowMarkdownFile(filePath);
  } else if (data.type === "podcast" || filePath.includes("/podcast/")) {
    return await processEpisodeMarkdownFile(filePath);
  }

  // Legacy processing for files without type specified
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
      //console.log(`Attempting to download poster: ${data.poster}`);
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
async function processMarkdownFiles(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      await processMarkdownFiles(filePath);
    } else if (path.extname(file) === ".mdx") {
      await processMarkdownFile(filePath);
    }
  }
}

// Process shows first, then episodes
async function processInOrder() {
  console.log("Processing show images first...");
  const showsPath = path.join(__dirname, "../../src/content/show/");
  if (fs.existsSync(showsPath)) {
    await processMarkdownFiles(showsPath);
  }

  // Add a delay to ensure show images are processed before episodes
  await delay(1000);

  console.log("Processing episode images...");
  const episodesPath = path.join(__dirname, "../../src/content/podcast/");
  if (fs.existsSync(episodesPath)) {
    await processMarkdownFiles(episodesPath);
  }

  // Process other folders
  for (const folderPath of folderPaths) {
    if (folderPath.includes("/show/") || folderPath.includes("/podcast/")) {
      continue; // Already processed above
    }
    
    if (fs.existsSync(folderPath)) {
      // console.log(`Processing files in: ${folderPath}`);
      await processMarkdownFiles(folderPath);
    }
  }
}

// Run the processing in order
processInOrder().catch(console.error);