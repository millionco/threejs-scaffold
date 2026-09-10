# Agent notes

## Screenshots

Use `bun scripts/capture.mjs` for every screenshot. Do not write an ad-hoc
Playwright script that saves a full-resolution PNG.

```bash
bun scripts/capture.mjs                           # one frame at 6s -> artifacts/capture.jpg
bun scripts/capture.mjs --at=2000,8000,15000      # a sequence
bun scripts/capture.mjs --name=summary --click    # click the canvas first
bun scripts/capture.mjs --width=1600 --height=900 # larger when you need detail
```

It reuses a running dev server, captures 1280x720 JPEGs under 180KB, and prints
the byte size and approximate token cost of each frame.

Why this matters: a 1280x720 PNG of a 3D scene is ~700KB, which becomes ~900KB
of base64 when inlined into a `read` result. Providers that bill inline images
as text charge ~250-350k tokens for one such image, so three screenshots
overflow a 1M-token context window and the session dies with a 400. The same
frame as JPEG is ~50KB and ~20k tokens — 13x cheaper at identical resolution.

Read one frame at a time and rely on the printed `approxReadTokens` to budget.

URLs retain query parameters and fragments. Use a visible readiness selector when
the scenario initializes asynchronously:

```bash
bun scripts/capture.mjs '--url=http://127.0.0.1:5173/?scene=test&debug=ao' '--ready=[data-scene="test"]' --at=0
```

To inspect a recorded video, serve a page containing its video element and use
`--video-at=28 --at=0` to capture the decoded frame at 28 seconds. The helper
loads the media as a blob so seeking works with servers that lack range support.
Capture output includes the actual page URL and, for video, the captured time.
The helper waits for document readiness, not network idleness; an open request
must not prevent a ready scene from being captured.

## Verification

Batch related edits. Run `bun run check:fast` at meaningful milestones and
`bun run check:final` once near completion. Both wait for their own bounded
subprocesses and return one JSON result; do not background them or poll logs.

## Tests

`tests/` holds the full intended coverage for this scaffold. Do not add test
files, frameworks, fixtures, mocks, or coverage tooling. Spend the time on the
Three.js app in `src/`.
