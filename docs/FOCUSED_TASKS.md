# Tutor, solar workspace and attendance reward update

- Tutor and Solar occupy the available viewport below the app header. Intro chapter banners, the footer and the bottom tab bar are omitted in these two views; the header menu remains available. Only messages, lesson content and horizontal selectors scroll, so the surrounding workspace stays still.
- Tutor uses the full content width instead of permanent history/source columns. Those tools open from the toolbar. The composer stays at the bottom; scrolling to new messages is scoped to the message pane and respects reading older content. Touch devices use Enter for newlines and the send button for submission.
- Solar keeps the model, controls and planet selector on screen. Below 1000px, model and lesson are tabs. Desktop has a scrollable lesson pane alongside the model. Existing GLB and rendering behavior are retained.
- New attendance claims award 3 coins per day plus 5 coins at every 7-day streak milestone. A 49-day cycle totals 182 coins. There is no additional day-49 bonus. Previously credited coins and claims remain unchanged; duplicate daily claims stay idempotent.

## Validation

TypeScript, production build and 130 unit/integration checks, including a legacy-reward preservation test. Browser QA rendered the actual ChatView and SolarView components in an isolated harness at 390×780 and 320×450 and in a 1363×936 desktop viewport. Verified root dimensions, source drawer, lesson tabs, question feedback and composer placement. The cloud browser disables WebGL, so the solar poster fallback was observed; live GPU interaction and physical iPhone Safari keyboards remain unverified.
