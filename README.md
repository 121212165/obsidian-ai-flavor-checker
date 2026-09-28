# AI Flavor Checker

An Obsidian plugin that scans the active note for "AI flavor" — the stock
phrases and patterns that make prose feel machine-written — and lists flagged
paragraphs in a side panel with click-to-jump navigation.

## Usage

1. Open the note you want to check.
2. Click the ribbon icon (traffic cone) or run **AI Flavor Checker: check
   active note** from the command palette.
3. The side panel lists every paragraph with at least one hit, sorted from
   heaviest to lightest:
   - 🔴 heavy — 4+ hits in one paragraph
   - 🟡 medium — 2–3 hits
   - 🟣 light — 1 hit
4. Click a result to jump to the line and select it in the editor.

Hit tags are color-coded by category: red for stock/banned phrases, yellow for
directly told emotions (sad, angry, terrified…) instead of shown ones, and grey
for AI-style completive verb patterns.

## Editing the word lists

The word lists are plain arrays at the top of `main.js`
(`BAN_PATTERNS`, `EMOTION_TELL`, `AI_VERB`), tuned for Chinese web-fiction
prose. Edit them to match your own style rules.

## Notes

- Plain JavaScript, no build step; `main.js` is the source.
- Runs entirely offline on the current note; nothing leaves your machine.
