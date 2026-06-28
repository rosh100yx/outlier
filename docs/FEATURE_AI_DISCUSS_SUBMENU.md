# Feature Request — Multi-AI Chat + Share Submenu (Growth Hack)

**Status:** Draft  
**Priority:** P1  
**Target:** v0.30.0  

## Problem

The `Chat with your AI` menu item currently opens a single hard-coded link to ChatGPT with a stock prompt:

- **No platform choice.** Users are forced to ChatGPT; many prefer Perplexity.
- **No retention loop.** The user clicks, chats, and the conversation with *this tool* ends. Outlier is a one-shot audit.
- **Prompt is generic.** It does not embed the user's actual audit stats or invite them back to Outlier.
- **Zero growth signal.** We miss the chance to plant a product nudge inside the chat every time they share.

## Solution

Add a **Chat submenu** after the user picks `💬 Chat with your AI (ChatGPT & Perplexity)`:

```
What next?
  🔊 Share flex receipt (Anonymized ASCII)
  💬 Chat with your AI (ChatGPT & Perplexity)   ← selected
    ├─ ChatGPT
    └─ Perplexity
  Pre-flight briefing
  Agent reach
  ...
```

**Behavior by platform:**
- **ChatGPT / Perplexity:** Open the platform with the prompt prefilled in the URL so the conversation starts immediately, no copy/paste needed.

## Share Submenu

Add a **Share submenu** after the user picks `📢 Share flex receipt (Anonymized ASCII)`:

```
What next?
  🔊 Share flex receipt (Anonymized ASCII)   ← selected
    ├─ X / Twitter
    ├─ Reddit
    ├─ Slack / Discord
    ├─ WhatsApp / Telegram
    ├─ Threads
    ├─ Facebook
    └─ Copy and Share link
  💬 Chat with your AI (ChatGPT & Perplexity)
  Pre-flight briefing
  ...
```

**Behavior by platform:**
- **X/Twitter:** Open tweet composer with the receipt quote prefilled.
- **Reddit:** Open `r/LocalLLM/submit` with a title pre-filled; user pastes receipt text.
- **Slack / Discord:** Copy the receipt ASCII to clipboard (no universal share intent).
- **WhatsApp / Telegram:** Open the respective messenger share flow with text.
- **Threads:** Open `threads.net/intent/post` with text.
- **Facebook:** Open Facebook share dialog with quote text.
- **Copy and Share link:** Copy receipt to clipboard for manual paste.

## Prompt Templates

Templates are injected with real audit stats and a natural nudge — never spammy.

**T1 — Direct help (default for all platforms):**
```
I just audited my AI coding workflow with Outlier. Here is my standing:

- Code Yield: {{yieldPct}}% ({{yieldLabel}}) — tokens that became committed lines
- Context Tax: {{cachePct}}% re-reading the same context
- Human authorship: {{humanPct}}% on this repo
- Blast Radius: {{radius}}
- Estimated session spend: ${{usd}}

One concrete improvement I want to make this week is:
[user fills in]

Can you help me draft a 3-day action plan?
```

**T2 — Growth nudge (optional, after T1):**
```
Outlier is the tool that ran this audit. It measures local-first AI authorship and code yield.
It runs entirely on my machine — no telemetry, no API keys, no cloud.

Have you seen anything like it? If not, the 3 things I'd want in a product like this are:
1. ...

What's missing from what's out there?
```

**T2 — Growth nudge (optional, after T1):**

1. **Re-opens the chat with the user's own AI.** That is the highest-retention surface they already use.
2. **Audit stats become social proof inside the conversation.** The user is discussing real data, not marketing copy.
3. **Prompt templates seed product language** ("Code Yield", "Context Tax", "Blast Radius") so the concepts migrate into their private AI vocabulary.

## Prompt Suggestions (for the user to pick)

We show a quick prompt picker after the platform select:

- `"How do I improve my code yield?"` → T1
- `"Why is my context tax so high?"` → T1 + window-management tips from assistant
- `"Review my blast radius risk"` → T1 + tool-reach analysis
- `"Draft a 3-day prompt skill routine"` → T2 style
- `(Custom) I'll write my own` → blank clipboard

## UI / UX Notes

- Receipt-styled header: `pc.bgCyan(pc.black(' DISCUSS '))` to match the audit receipt.
- Receipt-styled footer: `pc.cyan('→')` actions (copy prompt, open browser).
- Colors locked to audit palette: cyan for actions, green for success, yellow for warning.
- No new dependencies. Uses `execSync('pbcopy')` / `execSync('open')` already present in `share.ts`.

## Metrics to Track

- Which platform is selected most (ChatGPT vs Claude vs Gemini vs Perplexity).
- Whether the user later runs `outlier learn` or `outlier policy` (retention signal).
- npm installs / GitHub stars from our own logs (we don't collect this; we'll infer from GitHub traffic + npm download counts).

## Out of Scope (v0.30.0)

- Reading/transcribing the resulting conversation in the AI chat (privacy boundary).
- OAuth sign-in to any platform (would break local-first rule).
- Storing prompt history (local-only optional preference later).
