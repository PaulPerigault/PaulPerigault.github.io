export function extractUrls(sitemapXml: string): string[];
export function buildPayload(
  key: string,
  urls: string[],
): { host: string; key: string; keyLocation: string; urlList: string[] };
