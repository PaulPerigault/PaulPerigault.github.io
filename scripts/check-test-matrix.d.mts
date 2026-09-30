export function parseMatrix(text: string): {
  feature: string;
  issue: string;
  specs: string[];
  justified: boolean;
}[];
export function checkMatrix(rows: ReturnType<typeof parseMatrix>, specFiles: string[]): string[];
export function run(): string[];
