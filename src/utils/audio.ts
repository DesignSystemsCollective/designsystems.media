type AudioMimeType =
  | 'audio/mpeg'
  | 'audio/wav'
  | 'audio/ogg'
  | 'audio/mp4'
  | 'audio/aac'
  | 'audio/flac'
  | 'audio/webm';

type AudioExtension = 'mp3' | 'wav' | 'ogg' | 'oga' | 'm4a' | 'aac' | 'flac' | 'webm';

const mimeTypes: Record<AudioExtension, AudioMimeType> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  webm: "audio/webm",
};

/**
 * Get the MIME type for an audio file based on its URL extension
 * @param url - The URL of the audio file
 * @returns The MIME type for the audio file, defaults to 'audio/mpeg' if no match
 */
export function getAudioMimeType(url: string | undefined): AudioMimeType {
  if (!url) return "audio/mpeg";

  const extension = url.split(".").pop()?.toLowerCase() as AudioExtension;
  return mimeTypes[extension] || "audio/mpeg";
}
