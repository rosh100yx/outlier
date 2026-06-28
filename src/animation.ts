import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import pc from 'picocolors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRAMES_PATH = path.join(__dirname, 'assets', 'ascii-frames.json');

let frames: string[][] = [];

try {
  const raw = readFileSync(FRAMES_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    frames = parsed.filter((item: unknown): item is string[] => Array.isArray(item) && item.every((l: unknown) => typeof l === 'string'));
  }
} catch (e) {
  frames = [];
}

export function playNyanCatLoop(ms: number): (() => void) | null {
  if (!frames.length) return null;

  let idx = 0;
  let timer: NodeJS.Timeout | null = null;

  process.stdout.write('\x1b[?25l');
  process.stdout.write('\n');

  const current = frames[idx % frames.length]!;

  for (const line of current) {
    process.stdout.write(pc.dim(line) + '\n');
  }

  timer = setInterval(() => {
    idx++;
    const next = frames[idx % frames.length]!;
    process.stdout.write('\x1b[' + String(next.length) + 'F');
    for (const line of next) {
      process.stdout.write(pc.dim(line) + '\n');
    }
  }, ms);

  return () => {
    if (timer) clearInterval(timer);
    process.stdout.write('\x1b[?25h');
    process.stdout.write('\x1b[' + String(frames[idx % frames.length]!.length) + 'E');
  };
}
