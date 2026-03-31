import ora from 'ora';
import { getOutputMode } from './output.js';

let currentSpinner: ReturnType<typeof ora> | null = null;

export function startSpinner(text: string): void {
  if (getOutputMode() !== 'pretty') return;
  currentSpinner = ora(text).start();
}

export function stopSpinner(success?: boolean, text?: string): void {
  if (!currentSpinner) return;
  
  if (success === true) {
    currentSpinner.succeed(text);
  } else if (success === false) {
    currentSpinner.fail(text);
  } else {
    currentSpinner.stop();
  }
  
  currentSpinner = null;
}

export function updateSpinner(text: string): void {
  if (!currentSpinner || getOutputMode() !== 'pretty') return;
  currentSpinner.text = text;
}
