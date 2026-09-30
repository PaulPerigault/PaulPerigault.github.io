export function checkFile(
  file: string,
  text: string,
): { file: string; line: number; rule: string; message: string; excerpt: string }[];
export function run(root?: string): ReturnType<typeof checkFile>;
