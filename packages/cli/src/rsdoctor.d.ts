/**
 * Optional dependency: loaded at runtime when report (-r/--report) is enabled.
 * Not bundled; declared so dynamic import type-checks when package is not installed.
 */
declare module "@rsdoctor/rspack-plugin" {
  export class RsdoctorRspackPlugin {
    constructor(options?: Record<string, unknown>);
  }
}
