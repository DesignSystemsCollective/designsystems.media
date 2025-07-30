export interface PageMetadata {
  title: string;
  description?: string;
  image?: string;
  canonicalURL?: string;
  pageType?: 'article' | 'website';
  publishedDate?: Date;
  modifiedDate?: Date;
}

export interface SocialMetadata {
  og?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
    url?: string;
  };
  twitter?: {
    card?: 'summary' | 'summary_large_image';
    title?: string;
    description?: string;
    image?: string;
  };
}

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  class?: string;
}

export type ThemeType = 'light' | 'dark' | 'system';

export interface GridProps {
  gap?: string;
  columns?: number | string;
  minWidth?: string;
  maxWidth?: string;
  class?: string;
}
