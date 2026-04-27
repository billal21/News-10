
export interface NewsItem {
  title: string;
  link: string;
  pubDate?: string;
  contentSnippet?: string;
  sourceName?: string;
}

export interface GeneratedNews {
  webTitle: string;
  webFullArticle: string;
  fbCaption: string;
  fbCommentDetail: string;
}

export type TabType = 'international' | 'national' | 'web-post' | 'fb-post';
