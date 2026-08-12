# Three.js grader

This suite reads the application's live Three.js scene from Playwright. It
checks that the app completes a render with a connected WebGL canvas and that
its render loop continues to advance.

Run it from the repository root:

```bash
bun run test:grader
```
