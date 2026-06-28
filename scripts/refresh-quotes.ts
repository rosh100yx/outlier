#!/usr/bin/env ts-node
// scripts/refresh-quotes.ts
// Fetches AI headlines from RSS feeds and appends news-themed share quotes to src/share.ts

const FEEDS = [
  'https://hnrss.org/newest?count=40',
  'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://www.technologyreview.com/feed/',
];

const TARGET_FILE = 'src/share.ts';

async function fetchText(url: string): Promise<string> {
  const res: any = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function extractTitles(xml: string): string[] {
  const re = /<title[^>]*>([\s\S]*?)<\/title>/gi;
  const titles: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const raw = String(m[1]).replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
    if (raw && raw.length > 20 && raw.length < 200) titles.push(raw);
  }
  return titles;
}

function pickNewsTitles(titles: string[]): string[] {
  const keywords = [
    'AI', 'artificial intelligence', 'OpenAI', 'Anthropic', 'Google',
    'token', 'LLM', 'model', 'safety', 'regulation', 'copyright',
    'carbon', 'energy', 'cost', 'bill', 'hiring', 'junior dev',
    'EU AI Act', 'pause', 'alignment', 'agent', 'agentic', 'benchmark'
  ];
  const scored = titles
    .map(t => ({ t, s: keywords.filter(k => t.toLowerCase().includes(k.toLowerCase())).length }))
    .filter(x => x.s >= 1)
    .sort((a, b) => b.s - a.s);
  const unique = Array.from(new Set(scored.map(x => x.t)));
  return unique.slice(0, 8);
}

function toQuotes(titles: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const title of titles) {
    const q = `Headlines are becoming receipts: "${title}" — and my agent's still burning context on this.`;
    const q2 = `Breakfast news: "${title}". Afternoon reality: {{cachePct}}% reused context, zero alignment.`;
    const q3 = `Saw this headline: "${title}". Then I checked my blast radius: {{radius}}. Not unrelated.`;

    for (const candidate of [q, q2, q3]) {
      if (!seen.has(candidate) && candidate.length < 200) {
        seen.add(candidate);
        out.push(candidate);
      }
    }
    if (out.length >= 12) break;
  }
  return out;
}

async function main() {
  console.log('Fetching AI news...');
  let allTitles: string[] = [];
  for (const url of FEEDS) {
    try {
      const xml = await fetchText(url);
      const titles = extractTitles(xml);
      allTitles = allTitles.concat(titles);
      console.log(`  ${url} → ${titles.length} titles`);
    } catch (e) {
      console.warn(`  Failed ${url}: ${e}`);
    }
  }

  if (allTitles.length === 0) {
    console.log('No titles fetched. Exiting.');
    process.exit(1);
  }

  const picked = pickNewsTitles(allTitles);
  console.log(`Picked ${picked.length} relevant titles`);

  const newQuotes = toQuotes(picked);
  console.log(`Generated ${newQuotes.length} new quotes`);

  const fs = await import('fs');
  const original = fs.readFileSync(TARGET_FILE, 'utf8');

  const closeMatch = original.match(/const MUSK_QUOTES = \[([\s\S]*)\];/);
  if (!closeMatch) {
    console.error('Could not locate MUSK_QUOTES array');
    process.exit(1);
  }

  const existing = String(closeMatch[1]);
  const existingEntries = existing.match(/"(.+?)"/g)?.map(s => s.slice(1, -1)) || [];
  const merged = Array.from(new Set(existingEntries.concat(newQuotes)));
  const newBlock = merged.map(q => `  "${q.replace(/"/g, '\\"')}"`).join(',\n');

  const updated = original.replace(
    /const MUSK_QUOTES = \[[\s\S]*?\];/,
    `const MUSK_QUOTES = [\n${newBlock}\n];`
  );

  fs.writeFileSync(TARGET_FILE, updated);
  console.log(`Updated ${TARGET_FILE}: now ${merged.length} quotes total`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
