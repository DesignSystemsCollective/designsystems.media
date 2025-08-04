import type { ImageType } from './media';

export interface HeroProps {
  title: string;
  image?: ImageType | null;
  showArtwork?: boolean;
  showSlug: string;
  podcastTitle: string;
  hasEpisodeImage?: boolean;
  audioUrl?: string;
  speakers?: string[];
  tags?: string[];
}

export interface MetadataProps {
  title?: string;
  description?: string;
  image?: string;
  slug?: string;
  duration?: string;
  explicit?: boolean;
  pubDate?: Date;
}

export interface BaseLayoutProps {
  title: string;
  description?: string;
  image?: string;
  hasEpisodeImage?: boolean;
  showSlug?: string;
  slug?: string;
}
