// src/pages/api/generate.js
import { runAllMosaics } from "../../utils/generateSocialImages.js";

export async function GET() {
  await runAllMosaics();
  return new Response('Image generation complete', { status: 200 });
}