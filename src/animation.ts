import pc from 'picocolors';

export const FUN_HEADERS: string[] = [
  '   [NYAN] aadd%%##  local-first audit agent online',
  '   [NYAN]   aadd%%## measuring token bills...',
  '   [NYAN]     aadd%%## checking centaur alignment...',
  '   [NYAN]   aadd%%## zero telemetry, maximum vibes',
  '   [NYAN] aadd%%##  audit spawned — no cloud harmed',
];

export const FUN_FOOTERS: string[] = [
  'audit complete — copy-paste from chat is invisible; prompt quality unmeasured  aadd%%',
  'your AI is writing code you do not read — but we counted it anyway  %%##',
  'fresh eyes only. no context tax refunds.  aadd%%',
];

export function randomHeader(): string {
  return FUN_HEADERS[Math.floor(Math.random() * FUN_HEADERS.length)]!;
}

export function randomFooter(): string {
  return FUN_FOOTERS[Math.floor(Math.random() * FUN_FOOTERS.length)]!;
}
