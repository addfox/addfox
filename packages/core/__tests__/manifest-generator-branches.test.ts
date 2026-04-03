import { describe, it, expect } from '@rstest/core';
import type { EntryInfo } from '../src/types.ts';
import {
  generateManifestFromEntries,
  autoFillManifestFields,
  mergeWithGeneratedManifest,
  hasRequiredFields,
} from '../src/manifest/generator.ts';

describe('manifest generator branches', () => {
  describe('field version compatibility', () => {
    it('should not generate side_panel for MV2', () => {
      const entries: EntryInfo[] = [
        { name: 'sidepanel', scriptPath: '/app/sidepanel/index.ts', html: true, htmlPath: '/app/sidepanel/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 2);

      expect(manifest.side_panel).toBeUndefined();
    });

    it('should generate browser_action for popup in MV2', () => {
      const entries: EntryInfo[] = [
        { name: 'popup', scriptPath: '/app/popup/index.ts', html: true, htmlPath: '/app/popup/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 2);

      expect(manifest.browser_action).toEqual({ default_popup: 'popup/index.html' });
      expect(manifest.action).toBeUndefined();
    });

    it('should generate options_page for options in MV2', () => {
      const entries: EntryInfo[] = [
        { name: 'options', scriptPath: '/app/options/index.ts', html: true, htmlPath: '/app/options/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 2);

      expect(manifest.options_page).toBe('options/index.html');
      expect(manifest.options_ui).toBeUndefined();
    });

    it('should generate options_ui for options in MV3', () => {
      const entries: EntryInfo[] = [
        { name: 'options', scriptPath: '/app/options/index.ts', html: true, htmlPath: '/app/options/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.options_ui).toEqual({ page: 'options/index.html', open_in_tab: true });
      expect(manifest.options_page).toBeUndefined();
    });
  });

  describe('firefox-specific behavior', () => {
    it('should not generate side_panel for Firefox MV3', () => {
      const entries: EntryInfo[] = [
        { name: 'sidepanel', scriptPath: '/app/sidepanel/index.ts', html: true, htmlPath: '/app/sidepanel/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'firefox', 3);

      expect(manifest.side_panel).toBeUndefined();
      expect(manifest.permissions).toBeUndefined();
    });

    it('should generate background scripts for Firefox MV3', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
      ];
      const manifest = generateManifestFromEntries(entries, 'firefox', 3);

      expect(manifest.background).toEqual({ scripts: ['background/index.js'] });
    });

    it('should generate background scripts for Firefox MV2', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
      ];
      const manifest = generateManifestFromEntries(entries, 'firefox', 2);

      expect(manifest.background).toEqual({ scripts: ['background/index.js'] });
    });
  });

  describe('chrome_url_overrides combinations', () => {
    it('should generate all override types together', () => {
      const entries: EntryInfo[] = [
        { name: 'newtab', scriptPath: '/app/newtab/index.ts', html: true, htmlPath: '/app/newtab/index.html' },
        { name: 'bookmarks', scriptPath: '/app/bookmarks/index.ts', html: true, htmlPath: '/app/bookmarks/index.html' },
        { name: 'history', scriptPath: '/app/history/index.ts', html: true, htmlPath: '/app/history/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.chrome_url_overrides).toEqual({
        newtab: 'newtab/index.html',
        bookmarks: 'bookmarks/index.html',
        history: 'history/index.html',
      });
      expect(manifest.permissions).toContain('bookmarks');
      expect(manifest.permissions).toContain('history');
    });
  });

  describe('autoFillManifestFields edge cases', () => {
    it('should fill empty string values', () => {
      const entries: EntryInfo[] = [];
      const userManifest = {
        manifest_version: 3,
        name: '',
        version: '',
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.name).toBe('Extension');
      expect(filled.version).toBe('1.0.0');
    });

    it('should not modify existing valid fields', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
      ];
      const userManifest = {
        manifest_version: 3,
        name: 'My Extension',
        version: '2.0.0',
        background: { service_worker: 'custom.js' },
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.name).toBe('My Extension');
      expect(filled.version).toBe('2.0.0');
      expect(filled.background).toEqual({ service_worker: 'custom.js' });
    });

    it('should add sidePanel permission only for chromium MV3', () => {
      const entries: EntryInfo[] = [];
      const userManifest = {
        manifest_version: 2,
        name: 'Test',
        version: '1.0.0',
        side_panel: { default_path: 'sidepanel.html' },
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      // MV2 should not add sidePanel permission
      expect(filled.permissions).toBeUndefined();
    });

    it('should add sidePanel permission for chromium MV3', () => {
      const entries: EntryInfo[] = [];
      const userManifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        side_panel: { default_path: 'sidepanel.html' },
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.permissions).toContain('sidePanel');
    });

    it('should not add duplicate permissions', () => {
      const entries: EntryInfo[] = [];
      const userManifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        permissions: ['bookmarks', 'storage'],
        chrome_url_overrides: { bookmarks: 'bookmarks.html' },
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      const perms = filled.permissions as string[];
      expect(perms.filter(p => p === 'bookmarks').length).toBe(1);
      expect(perms).toContain('storage');
    });

    it('should handle empty permissions array', () => {
      const entries: EntryInfo[] = [];
      const userManifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        permissions: [],
        chrome_url_overrides: { bookmarks: 'bookmarks.html' },
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.permissions).toContain('bookmarks');
    });

    it('should handle missing chrome_url_overrides', () => {
      const entries: EntryInfo[] = [];
      const userManifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.permissions).toBeUndefined();
    });

    it('should handle empty chrome_url_overrides', () => {
      const entries: EntryInfo[] = [];
      const userManifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        chrome_url_overrides: {},
      };
      const filled = autoFillManifestFields(userManifest, entries, 'chromium');

      expect(filled.permissions).toBeUndefined();
    });
  });

  describe('mergeWithGeneratedManifest', () => {
    it('should preserve user values when merging', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
        { name: 'popup', scriptPath: '/app/popup/index.ts', html: true, htmlPath: '/app/popup/index.html' },
      ];
      const userManifest = {
        manifest_version: 3,
        name: 'Custom Name',
        version: '3.0.0',
        background: { service_worker: 'bg.js' },
        action: { default_popup: 'custom-popup.html' },
      };
      const merged = mergeWithGeneratedManifest(userManifest, entries, 'chromium');

      expect(merged.name).toBe('Custom Name');
      expect(merged.version).toBe('3.0.0');
      expect(merged.background).toEqual({ service_worker: 'bg.js' });
      expect(merged.action).toEqual({ default_popup: 'custom-popup.html' });
    });

    it('should add generated fields not in user manifest', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
        { name: 'content', scriptPath: '/app/content/index.ts', html: false },
      ];
      const userManifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
      };
      const merged = mergeWithGeneratedManifest(userManifest, entries, 'chromium');

      expect(merged.background).toBeDefined();
      expect(merged.content_scripts).toBeDefined();
    });

    it('should merge permissions correctly', () => {
      const entries: EntryInfo[] = [
        { name: 'bookmarks', scriptPath: '/app/bookmarks/index.ts', html: true, htmlPath: '/app/bookmarks/index.html' },
      ];
      const userManifest = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        permissions: ['storage'],
      };
      const merged = mergeWithGeneratedManifest(userManifest, entries, 'chromium');

      expect(merged.permissions).toContain('storage');
      expect(merged.permissions).toContain('bookmarks');
    });
  });

  describe('hasRequiredFields', () => {
    it('should return false for null/undefined values', () => {
      expect(hasRequiredFields({ manifest_version: null, name: 'Test', version: '1.0' })).toBe(false);
      expect(hasRequiredFields({ manifest_version: 3, name: null, version: '1.0' })).toBe(false);
      expect(hasRequiredFields({ manifest_version: 3, name: 'Test', version: null })).toBe(false);
    });

    it('should return true for valid manifest', () => {
      expect(hasRequiredFields({ manifest_version: 3, name: 'Test', version: '1.0' })).toBe(true);
      expect(hasRequiredFields({ manifest_version: 2, name: 'Test', version: '1.0' })).toBe(true);
    });
  });

  describe('complex entry combinations', () => {
    it('should handle all entry types together', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
        { name: 'content', scriptPath: '/app/content/index.ts', html: false },
        { name: 'popup', scriptPath: '/app/popup/index.ts', html: true, htmlPath: '/app/popup/index.html' },
        { name: 'options', scriptPath: '/app/options/index.ts', html: true, htmlPath: '/app/options/index.html' },
        { name: 'devtools', scriptPath: '/app/devtools/index.ts', html: true, htmlPath: '/app/devtools/index.html' },
        { name: 'sidepanel', scriptPath: '/app/sidepanel/index.ts', html: true, htmlPath: '/app/sidepanel/index.html' },
        { name: 'sandbox', scriptPath: '/app/sandbox/index.ts', html: true, htmlPath: '/app/sandbox/index.html' },
        { name: 'newtab', scriptPath: '/app/newtab/index.ts', html: true, htmlPath: '/app/newtab/index.html' },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.manifest_version).toBe(3);
      expect(manifest.background).toBeDefined();
      expect(manifest.content_scripts).toBeDefined();
      expect(manifest.action).toBeDefined();
      expect(manifest.options_ui).toBeDefined();
      expect(manifest.devtools_page).toBeDefined();
      expect(manifest.side_panel).toBeDefined();
      expect(manifest.sandbox).toBeDefined();
      expect(manifest.chrome_url_overrides).toBeDefined();
      expect(manifest.permissions).toContain('sidePanel');
    });

    it('should handle entries without html paths for script-only entries', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
        { name: 'content', scriptPath: '/app/content/index.ts', html: false },
      ];
      const manifest = generateManifestFromEntries(entries, 'chromium', 3);

      expect(manifest.background).toEqual({ service_worker: 'background/index.js' });
      expect(manifest.content_scripts).toBeDefined();
    });
  });
});
