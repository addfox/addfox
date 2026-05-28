/**
 * Minimal argv parser.
 * Replaces the `minimist` npm package to reduce supply-chain risk.
 */

export interface ParsedArgv {
  _: (string | number)[];
  [key: string]: string | number | boolean | (string | number)[] | undefined;
}

export function parseArgv(argv: string[]): ParsedArgv {
  const result: ParsedArgv = { _: [] };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--") {
      result._.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      let key: string;
      let value: string | boolean | number;

      if (eqIdx >= 0) {
        key = arg.slice(2, eqIdx);
        value = arg.slice(eqIdx + 1);
      } else {
        key = arg.slice(2);
        const next = argv[i + 1];
        if (next != null && !next.startsWith("-")) {
          value = next;
          i++;
        } else {
          value = true;
        }
      }

      const num = Number(value);
      if (!isNaN(num) && String(value) === String(num)) {
        value = num;
      }

      result[key] = value;
      continue;
    }

    if (arg.startsWith("-") && arg.length > 1) {
      const chars = arg.slice(1).split("");
      for (let j = 0; j < chars.length; j++) {
        const key = chars[j];
        const next = argv[i + 1];
        if (j === chars.length - 1 && next != null && !next.startsWith("-")) {
          const num = Number(next);
          result[key] = !isNaN(num) && String(next) === String(num) ? num : next;
          i++;
        } else {
          result[key] = true;
        }
      }
      continue;
    }

    const num = Number(arg);
    result._.push(!isNaN(num) && String(arg) === String(num) ? num : arg);
  }

  return result;
}
