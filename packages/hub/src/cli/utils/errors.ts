import { error } from './output.js';

export class HubError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'HubError';
  }
}

export function handleError(err: unknown): void {
  if (err instanceof HubError) {
    error(`${err.code}: ${err.message}`);
    if (err.details) {
      console.error(err.details);
    }
  } else if (err instanceof Error) {
    error(err.message);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
  } else {
    error(String(err));
  }
  
  process.exit(1);
}

export function wrapHandler(fn: (...args: any[]) => Promise<void>): (...args: any[]) => void {
  return (...args) => {
    fn(...args).catch(handleError);
  };
}
