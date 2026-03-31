import { spawn, ChildProcess } from 'child_process';
import { mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import getPort from 'get-port';
import type { BrowserType, Session } from '../types.js';
import { HubDB } from './db.js';

// Browser executable paths (similar to addfox's browser paths)
const BROWSER_PATHS: Record<BrowserType, Record<string, string[]>> = {
  chrome: {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ],
  },
  edge: {
    win32: [
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ],
    darwin: [
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ],
    linux: [
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
    ],
  },
  brave: {
    win32: [
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      `${process.env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    ],
    darwin: [
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    ],
    linux: [
      '/usr/bin/brave-browser',
      '/usr/bin/brave',
    ],
  },
  chromium: {
    win32: [
      'C:\\Program Files\\Chromium\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Chromium\\Application\\chrome.exe`,
    ],
    darwin: [
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    linux: [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ],
  },
};

export interface BrowserLaunchOptions {
  browser: BrowserType;
  extensionPath: string;
  userDataDir?: string;
  debuggingPort?: number;
  headless?: boolean;
  startUrl?: string;
}

export interface BrowserInstance {
  pid: number;
  process: ChildProcess;
  debuggingPort: number;
  userDataDir: string;
  close: () => Promise<void>;
}

export class BrowserManager {
  private instances = new Map<string, BrowserInstance>();

  constructor(private db: HubDB) {}

  /**
   * Find browser executable path
   */
  async findBrowserPath(browser: BrowserType): Promise<string | null> {
    // Check custom path from settings
    const customPath = this.db.settings.browserPaths[browser];
    if (customPath && existsSync(customPath)) {
      return customPath;
    }

    // Check default paths
    const platform = process.platform;
    const paths = BROWSER_PATHS[browser][platform] || [];
    
    for (const path of paths) {
      if (existsSync(path)) {
        return path;
      }
    }

    // Try command name as fallback
    if (platform === 'linux' || platform === 'darwin') {
      return browser;
    }

    return null;
  }

  /**
   * Create user data directory for session
   */
  async createUserDataDir(sessionId: string): Promise<string> {
    const dir = join(this.db.getConfigDir(), 'temp', 'chrome-profiles', sessionId);
    await mkdir(dir, { recursive: true });
    return dir;
  }

  /**
   * Launch browser with extension
   */
  async launch(sessionId: string, options: BrowserLaunchOptions): Promise<BrowserInstance> {
    const browserPath = await this.findBrowserPath(options.browser);
    if (!browserPath) {
      throw new Error(`Browser ${options.browser} not found. Please install it or set browser path in config.`);
    }

    const userDataDir = options.userDataDir || await this.createUserDataDir(sessionId);
    const debuggingPort = options.debuggingPort || await getPort({ port: 9222 });

    const args: string[] = [
      `--user-data-dir=${userDataDir}`,
      `--load-extension=${options.extensionPath}`,
      `--remote-debugging-port=${debuggingPort}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-popup-blocking',
    ];

    if (options.headless) {
      args.push('--headless=new');
    }

    // Start URL
    const startUrl = options.startUrl || 'chrome://extensions';
    args.push(startUrl);

    const proc = spawn(browserPath, args, {
      detached: false,
    });

    const instance: BrowserInstance = {
      pid: proc.pid!,
      process: proc,
      debuggingPort,
      userDataDir,
      close: async () => {
        proc.kill('SIGTERM');
        return new Promise((resolve) => {
          proc.on('exit', () => resolve());
        });
      },
    };

    this.instances.set(sessionId, instance);

    // Handle process exit
    proc.on('exit', async () => {
      this.instances.delete(sessionId);
      // Clean up user data dir
      try {
        await rm(userDataDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    return instance;
  }

  /**
   * Stop browser instance
   */
  async stop(sessionId: string): Promise<void> {
    const instance = this.instances.get(sessionId);
    if (instance) {
      await instance.close();
      this.instances.delete(sessionId);
    }
  }

  /**
   * Get running instance
   */
  getInstance(sessionId: string): BrowserInstance | undefined {
    return this.instances.get(sessionId);
  }

  /**
   * Check if browser is available
   */
  async isAvailable(browser: BrowserType): Promise<boolean> {
    const path = await this.findBrowserPath(browser);
    return path !== null;
  }

  /**
   * Get available browsers
   */
  async getAvailableBrowsers(): Promise<BrowserType[]> {
    const browsers: BrowserType[] = ['chrome', 'edge', 'brave', 'chromium'];
    const available: BrowserType[] = [];
    
    for (const browser of browsers) {
      if (await this.isAvailable(browser)) {
        available.push(browser);
      }
    }
    
    return available;
  }
}
