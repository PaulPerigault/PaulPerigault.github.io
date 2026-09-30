export function checkDocs(input: {
  files: { path: string; text: string }[];
  scripts: Set<string>;
  exists: (path: string) => boolean;
}): string[];
export function run(): string[];
