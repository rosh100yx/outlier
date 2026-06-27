export interface ParseResult {
  total: number;
  output: number;
  cache: number;
  sessions: number;
  cost: number;
  outputByModel: Record<string, number>;
}

export interface TokenLogParser {
  parse(): Promise<ParseResult>;
}
