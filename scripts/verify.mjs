import { execFile } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const mode = process.argv[2];
const cwd = process.cwd();
const outputLimit = 6_000;

const plans = {
  fast: [
    { name: "typecheck", script: "typecheck", timeoutMs: 120_000 },
    { name: "browser-health", script: "test:smoke", timeoutMs: 60_000 },
  ],
  final: [
    { name: "typecheck", script: "typecheck", timeoutMs: 120_000 },
    { name: "build", script: "build", timeoutMs: 120_000 },
    { name: "visual-smoke", script: "test:visual", timeoutMs: 180_000 },
  ],
};

if (!(mode in plans)) {
  process.stdout.write(
    `${JSON.stringify({ status: "failed", error: "usage", expected: ["fast", "final"] })}\n`,
  );
  process.exit(2);
}

function boundedOutput(stdout, stderr) {
  const output = `${stdout ?? ""}${stderr ?? ""}`.trim();
  if (output.length <= outputLimit) return output;
  const half = Math.floor(outputLimit / 2);
  return `${output.slice(0, half)}\n... output truncated ...\n${output.slice(-half)}`;
}

const startedAt = performance.now();
const completed = [];

for (const step of plans[mode]) {
  const stepStartedAt = performance.now();
  try {
    await execFileAsync("bun", ["run", step.script], {
      cwd,
      encoding: "utf8",
      env: process.env,
      maxBuffer: 4 * 1024 * 1024,
      timeout: step.timeoutMs,
    });
    completed.push({
      name: step.name,
      durationMs: Math.round(performance.now() - stepStartedAt),
    });
  } catch (error) {
    const result = {
      status: "failed",
      mode,
      step: step.name,
      timedOut: Boolean(error.killed),
      exitCode: typeof error.code === "number" ? error.code : null,
      durationMs: Math.round(performance.now() - startedAt),
      output: boundedOutput(error.stdout, error.stderr),
    };
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exit(1);
  }
}

process.stdout.write(
  `${JSON.stringify({
    status: "ok",
    mode,
    durationMs: Math.round(performance.now() - startedAt),
    steps: completed,
  })}\n`,
);
