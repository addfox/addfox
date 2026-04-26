/**
 * Lightweight argv parser — replaces minimist to reduce supply-chain risk.
 * Supports the subset of minimist features used by create-addfox-app.
 */

export type ParsedArgs = {
  _: string[];
  [key: string]: string | boolean | string[] | undefined;
};

export default function minimist(args: string[]): ParsedArgs {
  const result: ParsedArgs = { _: [] };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--") {
      result._.push(...args.slice(i + 1));
      break;
    }

    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      const key = eq >= 0 ? arg.slice(2, eq) : arg.slice(2);

      if (key) {
        if (eq >= 0) {
          const value = arg.slice(eq + 1);
          result[key] = value === "true" ? true : value === "false" ? false : value;
        } else {
          const next = args[i + 1];
          const hasValue = next !== undefined && !next.startsWith("-");
          result[key] = hasValue ? next : true;
          if (hasValue) i++;
        }
      }
      continue;
    }

    if (arg.startsWith("-") && arg.length > 1) {
      const key = arg.slice(1);
      const next = args[i + 1];
      const hasValue = next !== undefined && !next.startsWith("-");
      result[key] = hasValue ? next : true;
      if (hasValue) i++;
      continue;
    }

    result._.push(arg);
  }

  return result;
}
