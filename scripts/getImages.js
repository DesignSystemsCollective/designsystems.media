const fs = require("fs");
const path = require("path");
const axios = require("axios");
const matter = require("gray-matter");

const folderPath = "src/content/media"; // Updated folder path

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

function processMarkdownFile(filePath) {
  console.log(`Processing: ${filePath}`);

  const markdownContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(markdownContent);

  if (data.image && data.localImages === false) {
    const imageFileName = path.basename(data.image);
    const imageOutputPath = path.join(path.dirname(filePath), imageFileName);

    console.log(`Downloading: ${data.image}`);
    downloadImage(data.image, imageOutputPath)
      .then(() => {
        console.log(`Downloaded: ${data.image}`);
        // Change localImages to true after processing
        data.localImages = true;
        // Update the "image" key with the local file path wrapped in double quotes
        data.image = `./${imageFileName}`;

        // Create the updated front matter string
        const updatedFrontMatter = Object.entries(data)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join("\n");

        // Combine the updated front matter and content
        const updatedMarkdown = `---\n${updatedFrontMatter}\n---\n${content}`;

        // Update the content of the file
        fs.writeFileSync(filePath, updatedMarkdown);
      })
      .catch((err) =>
        console.error(`Error downloading ${data.image}: ${err.message}`)
      );
  }

  if (data.poster && data.localImages === false) {
    const posterFileName = path.basename(data.poster);
    const posterOutputPath = path.join(path.dirname(filePath), posterFileName);

    console.log(`Downloading: ${data.poster}`);
    downloadImage(data.poster, posterOutputPath)
      .then(() => {
        console.log(`Downloaded: ${data.poster}`);
        // Change localImages to true after processing
        data.localImages = true;
        // Update the "poster" key with the local file path wrapped in double quotes
        data.poster = `./${posterFileName}`;

        // Create the updated front matter string
        const updatedFrontMatter = Object.entries(data)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join("\n");

        // Combine the updated front matter and content
        const updatedMarkdown = `---\n${updatedFrontMatter}\n---\n${content}`;

        // Update the content of the file
        fs.writeFileSync(filePath, updatedMarkdown);
      })
      .catch((err) => {
        console.error(`Error downloading ${data.poster}: ${err.message}`);

        // Change localImages to true after processing
        data.localImages = true;
        // Update the "poster" key with the local file path wrapped in double quotes
        data.poster = `./hqdefault.jpg`;

        // Create the updated front matter string
        const updatedFrontMatter = Object.entries(data)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join("\n");

        // Combine the updated front matter and content
        const updatedMarkdown = `---\n${updatedFrontMatter}\n---\n${content}`;

        // Update the content of the file
        fs.writeFileSync(filePath, updatedMarkdown);
      });
  }
}

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
