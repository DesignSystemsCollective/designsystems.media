const fs = require("fs");
const path = require("path");
const axios = require("axios");
const matter = require("gray-matter");

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 500;
const DEFAULT_FALLBACK = "./hqdefault.jpg";

// Content type processors
const processors = {
  show: processShow,
  podcast: processEpisode,
  default: processLegacy
};

async function downloadImage(url, outputPath, retryCount = 0) {
  try {
    console.log(`Downloading: ${url}`);
    const response = await axios({
      method: "get",
      url,
      responseType: "stream",
    });

    await new Promise((resolve, reject) => {
      const stream = response.data.pipe(fs.createWriteStream(outputPath));
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    console.log(`Downloaded: ${url}`);
  } catch (error) {
    if (retryCount < MAX_RETRY_COUNT) {
      await delay(RETRY_DELAY);
      return downloadImage(url, outputPath, retryCount + 1);
    }
    throw error;
  }
}

async function processShow(data, filePath) {
  if (!data.image) return data;

  const posterPath = path.join(path.dirname(filePath), "poster.jpg");

  try {
    console.log(`Downloading show image: ${data.image}`);
    await downloadImage(data.image, posterPath);
    
    return {
      ...data,
      image: "./poster.jpg",
      localImages: true
    };
  } catch (err) {
    console.error(`Error downloading show image: ${err.message}`);
    return {
      ...data,
      image: DEFAULT_FALLBACK,
      localImages: true
    };
  }
}

async function processEpisode(data, filePath) {
  // Episode has custom image
  if (data.hasEpisodeImage && data.image && !data.image.startsWith('../show/')) {
    const posterPath = path.join(path.dirname(filePath), "poster.jpg");

    try {
      console.log(`Downloading episode image: ${data.image}`);
      await downloadImage(data.image, posterPath);
      
      return {
        ...data,
        image: "./poster.jpg",
        localImages: true
      };
    } catch (err) {
      console.error(`Error downloading episode image: ${err.message}`);
      
      return {
        ...data,
        image: data.showSlug ? `../show/${data.showSlug}/poster.jpg` : DEFAULT_FALLBACK,
        hasEpisodeImage: false,
        localImages: true
      };
    }
  }

  // Episode uses show image
  if (data.showSlug && !data.image?.startsWith('../show/')) {
    return {
      ...data,
      image: `../show/${data.showSlug}/poster.jpg`,
      localImages: true
    };
  }

  // Already properly configured
  if (data.image?.startsWith('../show/')) {
    return { ...data, localImages: true };
  }

  return data;
}

async function processLegacy(data, filePath) {
  const posterPath = path.join(path.dirname(filePath), "poster.jpg");
  const imageUrl = data.poster || data.image;

  if (!imageUrl) return data;

  try {
    console.log(`Downloading legacy image: ${imageUrl}`);
    await downloadImage(imageUrl, posterPath);
    
    return {
      ...data,
      image: "./poster.jpg",
      poster: "./poster.jpg",
      localImages: true
    };
  } catch (err) {
    console.error(`Error downloading legacy image: ${err.message}`);
    return {
      ...data,
      image: DEFAULT_FALLBACK,
      poster: DEFAULT_FALLBACK,
      localImages: true
    };
  }
}

function getContentType(data, filePath) {
  if (data.type === "show" || filePath.includes("/show/")) return "show";
  if (data.type === "podcast" || filePath.includes("/podcast/")) return "podcast";
  return "default";
}

async function processMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const { data, content: markdownContent } = matter(content);

  // Skip if already processed
  if (data.localImages === true) {
    console.log(`Skipping already processed: ${filePath}`);
    return;
  }

  const contentType = getContentType(data, filePath);
  const processor = processors[contentType];
  
  const updatedData = await processor(data, filePath);
  
  // Only update file if data changed
  if (JSON.stringify(updatedData) !== JSON.stringify(data)) {
    updateMarkdownFile(filePath, updatedData, markdownContent);
    console.log(`Updated: ${filePath}`);
  }
}

function updateMarkdownFile(filePath, data, content) {
  const frontMatter = Object.entries(data)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");

  const updatedMarkdown = `---\n${frontMatter}\n---\n${content}`;
  fs.writeFileSync(filePath, updatedMarkdown);
}

async function processDirectory(directory) {
  if (!fs.existsSync(directory)) {
    console.log(`Directory not found: ${directory}`);
    return;
  }

  const files = fs.readdirSync(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      await processDirectory(filePath);
    } else if (path.extname(file) === ".mdx") {
      await processMarkdownFile(filePath);
    }
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const basePath = path.join(__dirname, "../../src/content");
  const directories = ["show", "podcast", "media"];

  console.log("Processing content directories...");

  for (const dir of directories) {
    const fullPath = path.join(basePath, dir);
    console.log(`\nProcessing: ${fullPath}`);
    await processDirectory(fullPath);
    
    // Small delay between directories
    await delay(100);
  }

  console.log("\nProcessing complete!");
}

main().catch(console.error);
