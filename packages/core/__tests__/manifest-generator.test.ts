import { describe, it, expect } from '@rstest/core';
import type { EntryInfo } from '../src/types.ts';
import {
  generateManifestFromEntries,
  autoFillManifestFields,
  mergeWithGeneratedManifest,
  hasRequiredFields,
} from '../src/manifest/generator.ts';

describe('manifest generator', () => {
  describe('generateManifestFromEntries', () => {
    it('should generate basic manifest with required fields', () => {
      const entries: EntryInfo[] = [];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.manifest_version).toBe(3);
      expect(manifest.name).toBe('Extension');
      expect(manifest.version).toBe('1.0.0');
    });

    it('should generate MV2 manifest', () => {
      const entries: EntryInfo[] = [];
      const manifest = generateManifestFromEntries(entries, 'chromium', 2);

      expect(manifest.manifest_version).toBe(2);
      expect(manifest.name).toBe('Extension');
      expect(manifest.version).toBe('1.0.0');
    });

    it('should generate background field for background entry', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.background).toEqual({ service_worker: 'background/index.js' });
    });

    it('should generate MV2 background scripts for Firefox', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
      ];
      const manifest = generateManifestFromEntries(entries, 'firefox', 2);

      expect(manifest.background).toEqual({ scripts: ['background/index.js'] });
    });

    it('should generate MV3 background scripts for Firefox', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
      ];
      const manifest = generateManifestFromEntries(entries, 'firefox', 3);

      expect(manifest.background).toEqual({ scripts: ['background/index.js'] });
    });

    it('should generate action field for popup entry (MV3)', () => {
      const entries: EntryInfo[] = [
        { name: 'popup', scriptPath: '/app/popup/index.ts', html: true, htmlPath: '/app/popup/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.action).toEqual({ default_popup: 'popup/index.html' });
    });

    it('should generate browser_action for popup entry (MV2)', () => {
      const entries: EntryInfo[] = [
        { name: 'popup', scriptPath: '/app/popup/index.ts', html: true, htmlPath: '/app/popup/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 2);

      expect(manifest.browser_action).toEqual({ default_popup: 'popup/index.html' });
    });

    it('should generate content_scripts for content entry', () => {
      const entries: EntryInfo[] = [
        { name: 'content', scriptPath: '/app/content/index.ts', html: false },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.content_scripts).toEqual([
        { matches: ['<all_urls>'], js: ['content/index.js'], run_at: 'document_idle' },
      ]);
    });

    it('should generate options_ui for options entry (MV3)', () => {
      const entries: EntryInfo[] = [
        { name: 'options', scriptPath: '/app/options/index.ts', html: true, htmlPath: '/app/options/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.options_ui).toEqual({ page: 'options/index.html', open_in_tab: true });
    });

    it('should generate options_page for options entry (MV2)', () => {
      const entries: EntryInfo[] = [
        { name: 'options', scriptPath: '/app/options/index.ts', html: true, htmlPath: '/app/options/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 2);

      expect(manifest.options_page).toBe('options/index.html');
    });

    it('should generate devtools_page for devtools entry', () => {
      const entries: EntryInfo[] = [
        { name: 'devtools', scriptPath: '/app/devtools/index.ts', html: true, htmlPath: '/app/devtools/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.devtools_page).toBe('devtools/index.html');
    });

    it('should generate side_panel for sidepanel entry (MV3 Chromium)', () => {
      const entries: EntryInfo[] = [
        { name: 'sidepanel', scriptPath: '/app/sidepanel/index.ts', html: true, htmlPath: '/app/sidepanel/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.side_panel).toEqual({ default_path: 'sidepanel/index.html' });
      expect(manifest.permissions).toContain('sidePanel');
    });

    it('should not generate side_panel for Firefox', () => {
      const entries: EntryInfo[] = [
        { name: 'sidepanel', scriptPath: '/app/sidepanel/index.ts', html: true, htmlPath: '/app/sidepanel/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'firefox', 3);

      expect(manifest.side_panel).toBeUndefined();
    });

    it('should generate sandbox field for sandbox entry', () => {
      const entries: EntryInfo[] = [
        { name: 'sandbox', scriptPath: '/app/sandbox/index.ts', html: true, htmlPath: '/app/sandbox/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.sandbox).toEqual({ pages: ['sandbox/index.html'] });
    });

    it('should generate chrome_url_overrides for newtab entry', () => {
      const entries: EntryInfo[] = [
        { name: 'newtab', scriptPath: '/app/newtab/index.ts', html: true, htmlPath: '/app/newtab/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.chrome_url_overrides).toEqual({ newtab: 'newtab/index.html' });
    });

    it('should generate chrome_url_overrides with bookmarks and add permission', () => {
      const entries: EntryInfo[] = [
        { name: 'bookmarks', scriptPath: '/app/bookmarks/index.ts', html: true, htmlPath: '/app/bookmarks/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.chrome_url_overrides).toEqual({ bookmarks: 'bookmarks/index.html' });
      expect(manifest.permissions).toContain('bookmarks');
    });

    it('should generate chrome_url_overrides with history and add permission', () => {
      const entries: EntryInfo[] = [
        { name: 'history', scriptPath: '/app/history/index.ts', html: true, htmlPath: '/app/history/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.chrome_url_overrides).toEqual({ history: 'history/index.html' });
      expect(manifest.permissions).toContain('history');
    });

    it('should generate combined manifest with multiple entries', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
        { name: 'content', scriptPath: '/app/content/index.ts', html: false },
        { name: 'popup', scriptPath: '/app/popup/index.ts', html: true, htmlPath: '/app/popup/index.html' },
        { name: 'options', scriptPath: '/app/options/index.ts', html: true, htmlPath: '/app/options/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.manifest_version).toBe(3);
      expect(manifest.background).toEqual({ service_worker: 'background/index.js' });
      expect(manifest.content_scripts).toBeDefined();
      expect(manifest.action).toBeDefined();
      expect(manifest.options_ui).toBeDefined();
    });
  });

  describe('autoFillManifestFields', () => {
    it('should fill missing required fields', () => {
      const entries: EntryInfo[] = [];
      const userManifest = { manifest_version: 3 };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.name).toBe('Extension');
      expect(filled.version).toBe('1.0.0');
      expect(filled.manifest_version).toBe(3);
    });

    it('should not overwrite existing fields', () => {
      const entries: EntryInfo[] = [];
      const userManifest = {
        manifest_version: 3,
        name: 'My Extension',
        version: '2.0.0',
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.name).toBe('My Extension');
      expect(filled.version).toBe('2.0.0');
    });

    it('should auto-fill background field if missing', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
      ];
      const userManifest = { manifest_version: 3, name: 'Test', version: '1.0.0' };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.background).toEqual({ service_worker: 'background/index.js' });
    });

    it('should not overwrite existing background field', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
      ];
      const userManifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        background: { service_worker: 'custom.js' },
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.background).toEqual({ service_worker: 'custom.js' });
    });

    it('should add sidePanel permission when side_panel is present', () => {
      const entries: EntryInfo[] = [];
      const userManifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        side_panel: { default_path: 'sidepanel/index.html' },
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.permissions).toContain('sidePanel');
    });

    it('should add bookmarks permission when chrome_url_overrides.bookmarks is present', () => {
      const entries: EntryInfo[] = [];
      const userManifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        chrome_url_overrides: { bookmarks: 'bookmarks/index.html' },
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.permissions).toContain('bookmarks');
    });

    it('should add history permission when chrome_url_overrides.history is present', () => {
      const entries: EntryInfo[] = [];
      const userManifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        chrome_url_overrides: { history: 'history/index.html' },
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.permissions).toContain('history');
    });

    it('should merge permissions instead of overwriting', () => {
      const entries: EntryInfo[] = [];
      const userManifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        permissions: ['storage'],
        chrome_url_overrides: { bookmarks: 'bookmarks/index.html' },
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.permissions).toContain('storage');
      expect(filled.permissions).toContain('bookmarks');
    });
  });

  describe('mergeWithGeneratedManifest', () => {
    it('should merge user manifest with generated fields', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
        { name: 'popup', scriptPath: '/app/popup/index.ts', html: true, htmlPath: '/app/popup/index.html' },
      ];
      const userManifest = {
        manifest_version: 3,
        name: 'My Extension',
        version: '1.0.0',
      };
      const merged = mergeWithGeneratedManifest(userManifest, entries, 'chromium');

      expect(merged.name).toBe('My Extension');
      expect(merged.background).toEqual({ service_worker: 'background/index.js' });
      expect(merged.action).toBeDefined();
    });

    it('should preserve user-specified entry fields', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
      ];
      const userManifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        background: { service_worker: 'custom-background.js' },
      };
      const merged = mergeWithGeneratedManifest(userManifest, entries, 'chromium');

      expect(merged.background).toEqual({ service_worker: 'custom-background.js' });
    });
  });

  describe('hasRequiredFields', () => {
    it('should return true for complete manifest', () => {
      const manifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
      };
      expect(hasRequiredFields(manifest)).toBe(true);
    });

    it('should return false when manifest_version is missing', () => {
      const manifest = { name: 'Test', version: '1.0.0' };
      expect(hasRequiredFields(manifest)).toBe(false);
    });

    it('should return false when name is missing', () => {
      const manifest = { manifest_version: 3, version: '1.0.0' };
      expect(hasRequiredFields(manifest)).toBe(false);
    });

    it('should return false when version is missing', () => {
      const manifest = { manifest_version: 3, name: 'Test' };
      expect(hasRequiredFields(manifest)).toBe(false);
    });

    it('should return false for empty values', () => {
      expect(hasRequiredFields({ manifest_version: 3, name: '', version: '1.0' })).toBe(false);
      expect(hasRequiredFields({ manifest_version: 3, name: 'Test', version: '' })).toBe(false);
    });
  });
});
