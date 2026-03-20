import path from "path";
import { fileURLToPath } from "url";
import { loadContentEntries, validateContentEntries } from "./lib/content-validation.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentRoot = path.resolve(__dirname, "../src/content");

const entries = await loadContentEntries(contentRoot);
const errors = await validateContentEntries(entries);

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const error of errors) {
    console.error(`- ${error.message}`);
  }
  process.exit(1);
}

console.log("Content validation passed.");
