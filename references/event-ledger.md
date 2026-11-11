# Event ledger

Use a single JSON file for named motion events when shared markers help implementation and review. Each event lists what must be visible before the action, during it, and after it. Start with the intended result from the brief. A supplied reference can add source timing and separate notes about observation and inference.

## Fields

| Field | Meaning |
| --- | --- |
| `version` | `1` |
| `reference` | Optional object with nonempty `source`, `observed`, `transfer`, and `redesign`. Add `inferred` when implementation is uncertain. |
| `events[].id` | Unique lowercase letters, digits and hyphens, beginning with a letter. |
| `events[].expected` | Nonempty descriptions at `before`, `action` and `after`. |
| `events[].referenceSeconds` | Optional before/action/after seconds relative to the source clip start. |
| `events[].webProgress` | Optional before/action/after values in `[0, 1]`, with the application's progress increasing along the story. |
| `events[].videoSeconds` | Optional before/action/after seconds relative to the delivered video start. |

Supply `webProgress`, `videoSeconds`, or both for each event. Each supplied track uses three strictly increasing markers. Different events can overlap. For an original brief, omit the reference object and referenceSeconds. The supplied example uses only output markers. When adding a source clip, enter its factual provenance and verified source times in referenceSeconds.

## Executable helper

The script uses Node.js built-ins. Frame extraction uses existing `ffmpeg` and `ffprobe` on `PATH`.

```text
node <skill>/scripts/event-ledger.mjs validate <ledger.json>
node <skill>/scripts/event-ledger.mjs frames <ledger.json> referenceSeconds <reference.mp4> <output-dir>
node <skill>/scripts/event-ledger.mjs frames <ledger.json> videoSeconds <delivery.mp4> <output-dir>
```

Use a task-owned output directory. Existing frame paths cause a failure before sampling. The script reports how many events were covered and which lacked the requested track. Frame extraction uses time-based seeking. For exact native PTS or variable-frame-rate analysis, use the applicable film workflow.

## Playwright integration

From a project-owned Node or Playwright script, import `readEventLedger` and `markersFor` from the helper using the local path. `markersFor(ledger, 'webProgress')` returns `{ eventId, phase, at, expected }` entries. Use the project's real scroll range or its existing deterministic seek entry point. Wait for assets and the new rendered state before each capture.

```js
const ledger = await readEventLedger(ledgerPath);
for (const { eventId, phase, at } of markersFor(ledger, 'webProgress')) {
  await seekStory(page, at);
  await page.screenshot({ path: join(outputDirectory, `${eventId}-${phase}.png`) });
}
```

`seekStory` is the project's own adapter. Run separate tests for normal input, such as scroll, chapter selection, reversal or playback. Use captures for visual inspection and compare the corresponding event phases.
