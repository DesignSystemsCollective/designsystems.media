// transcript.ts
//
// Fetches a video's existing YouTube captions (manual or auto-generated) as
// plain text, for videos that have them. Deliberately caption-only: no
// audio download, no Whisper/local-model transcription for videos without
// captions - that fallback needs tools (yt-dlp binary, a transcription
// model) this runs in GitHub Actions, where only network access to
// YouTube's own caption endpoint is available.

const { getSubtitles } = require("youtube-captions-scraper");

function extractVideoId(videoUrl: string): string | null {
  return new URL(videoUrl).searchParams.get("v");
}

// Returns the video's transcript as plain text, or null if it has no
// captions in `lang` (including auto-generated ones) - getSubtitles throws
// in that case rather than returning an empty result, so that's caught here
// rather than left to propagate and abort the whole aggregation run over
// one caption-less video.
async function fetchTranscript(videoUrl: string, lang: string = "en"): Promise<string | null> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    return null;
  }

  try {
    // getSubtitles already HTML-decodes and strips tags from each segment's
    // `text` internally - joined as-is here, no further decoding needed.
    const captions: Array<{ text: string }> = await getSubtitles({ videoID: videoId, lang });
    if (!captions.length) {
      return null;
    }
    return captions.map((caption) => caption.text).join(" ");
  } catch (error: any) {
    console.warn(`No transcript available for ${videoUrl}: ${error.message}`);
    return null;
  }
}

module.exports = { fetchTranscript };
