# Three.js grader

This suite reads the application's live Three.js scene from Playwright. It
checks that the app completes a render with a connected WebGL canvas and that
its render loop continues to advance.

Run it from the repository root:

```bash
bun run test:grader
```

`three-playwright/` contains an inline copy of the runtime and `attachThree` API
from [`millionco/threewright`](https://github.com/millionco/threewright) at
commit `7286603a179ef1e98c6cbfb4620def6f987f1835`. It is kept local intentionally,
so the grader adds no package or registry dependency. See `three-playwright/LICENSE` for
the upstream license.
