# Mobile chat refinement

The iPhone screenshot showed a double focus boundary around the message input, a permanently visible character counter, and an unbalanced input/send row.

- The input now has a single subtle wrapper focus boundary. The textarea keeps a 16px font to avoid iOS input zoom, with a 44px starting height and a 136px cap.
- Send is a 44px circle aligned with the bottom of multiline input. Empty drafts use a neutral disabled state. The counter appears at 1800 characters.
- The mobile header has a 44px accessible block action and ellipsis for long names.
- Empty conversations show a small greeting after messages have loaded; loading and error states remain distinct.
- VisualViewport sizing now also updates on focus changes and when the conversation moves between portal/desktop layouts. Bottom scrolling stays scoped to the message list and preserves users reading older messages.

## Verification

Production build, TypeScript and existing unit/integration checks. A browser CSS fixture loads the production styles in 320×440, 390×700 and 430×500 frames. Checked focused input, long names, multiline drafts, 44px send targets and horizontal overflow. This fixture checks CSS, not authenticated delivery or a real iOS software keyboard. Physical Safari keyboard and two-account messaging remain device-level verification limits.
