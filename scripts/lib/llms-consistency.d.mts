export const PROFILE_SEPARATOR: string;
export function llmsConsistencyProblems(input: {
  origin: string;
  llms: string;
  llmsFull: string;
  profiles: string[];
  sitemapUrls: string[];
}): string[];
