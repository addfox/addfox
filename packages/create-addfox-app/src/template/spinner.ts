import { yellow } from "kolorist";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const INTERVAL_MS = 80;

function clearSpinnerLine(): void {
  process.stdout.write("\r\x1b[K");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type TemplateSpinnerOptions = {
  /**
   * Keep the spinner visible at least this long after `fn` starts.
   * Use for fast local copies so the animation is noticeable (sync work used to block the spinner).
   */
  minVisibleMs?: number;
};

/**
 * Runs `fn` while showing a Braille-dot spinner + label on one terminal line.
 * No-op animation when stdout is not a TTY (e.g. CI).
 */
export async function runWithTemplateSpinner<T>(
  label: string,
  fn: () => Promise<T>,
  options?: TemplateSpinnerOptions,
): Promise<T> {
  const minVisibleMs = options?.minVisibleMs ?? 0;

  if (!process.stdout.isTTY) {
    console.log(yellow(`\n  ${label}\n`));
    return fn();
  }

  let frameIndex = 0;
  process.stdout.write("\n");
  const timer = setInterval(() => {
    const frame = FRAMES[frameIndex % FRAMES.length];
    frameIndex += 1;
    process.stdout.write(`\r  ${yellow(frame)} ${label}`);
  }, INTERVAL_MS);

  const startedAt = Date.now();
  try {
    const result = await fn();
    const elapsed = Date.now() - startedAt;
    if (elapsed < minVisibleMs) {
      await sleep(minVisibleMs - elapsed);
    }
    return result;
  } finally {
    clearInterval(timer);
    clearSpinnerLine();
    process.stdout.write("\n");
  }
}
