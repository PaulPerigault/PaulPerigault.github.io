import { FormatDatePipe } from './format-date.pipe';

describe('FormatDatePipe', () => {
  const pipe = new FormatDatePipe();

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('transforms 2023-09 to a readable date', () => {
    const result = pipe.transform('2023-09');
    expect(result).toContain('2023');
  });

  it('transforms 2024-01 correctly', () => {
    const result = pipe.transform('2024-01');
    expect(result).toContain('2024');
  });
});
