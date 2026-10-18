export function buildSite(options?: { env?: Record<string, string> }): Promise<{
  status: number | null;
  output: string;
  outDir: string;
}>;

export function disposeBuild(outDir: string): void;
