import { expect, test as playwrightTest } from "@playwright/test";
import { attachThree, type Three } from "./three-playwright/index.js";

interface ThreeFixtures {
  three: Three;
}

export const test = playwrightTest.extend<ThreeFixtures>({
  three: async ({ page }, useThree) => {
    await useThree(await attachThree(page));
  },
});

export { expect };
