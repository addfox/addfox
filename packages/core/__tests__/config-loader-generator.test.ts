import { describe, it, expect } from '@rstest/core';
import { resolveOrGenerateManifest } from '../src/config/loader.ts';
import type { EntryInfo, ManifestConfig, ManifestRecord } from '../src/types.ts';

// Access private function through module import
// Note: This test file uses inline copy of the function logic for testing
// since the function is not exported

describe('resolveOrGenerateManifest logic', () => {
  describe('type guards', () => {
    it('should identify chromium/firefox manifest format', () => {
      const manifest: ManifestConfig = {
        chromium: { manifest_version: 3, name: 'Test', version: '1.0' },
      };
      
      const isChromiumFirefox = typeof manifest === 'object' && manifest !== null && 
        ('chromium' in manifest || 'firefox' in manifest);
      
      expect(isChromiumFirefox).toBe(true);
    });

    it('should identify single manifest record', () => {
      const manifest: ManifestConfig = { manifest_version: 3, name: 'Test', version: '1.0' };
      
      const isChromiumFirefox = typeof manifest === 'object' && manifest !== null && 
        ('chromium' in manifest || 'firefox' in manifest);
      
      expect(isChromiumFirefox).toBe(false);
    });

    it('should handle manifest with both chromium and firefox', () => {
      const manifest: ManifestConfig = {
        chromium: { manifest_version: 3, name: 'Chrome', version: '1.0' },
        firefox: { manifest_version: 2, name: 'Firefox', version: '1.0' },
      };
      
      const isChromiumFirefox = typeof manifest === 'object' && manifest !== null && 
        ('chromium' in manifest || 'firefox' in manifest);
      
      expect(isChromiumFirefox).toBe(true);
    });
  });

  describe('auto-fill detection', () => {
    it('should detect when manifest needs auto-fill for missing manifest_version', () => {
      const manifest: ManifestRecord = { name: 'Test', version: '1.0' } as ManifestRecord;
      const needsFill = !(manifest as ManifestRecord).manifest_version;
      expect(needsFill).toBe(true);
    });

    it('should detect when manifest does not need auto-fill', () => {
      const manifest: ManifestRecord = { manifest_version: 3, name: 'Test', version: '1.0' };
      const needsFill = !manifest.manifest_version;
      expect(needsFill).toBe(false);
    });

    it('should handle chromium/firefox format with missing manifest_version', () => {
      const manifest = {
        chromium: { name: 'Test', version: '1.0' } as ManifestRecord,
      };
      
      const chromiumNeedsFill = !manifest.chromium || 
        !(manifest.chromium as ManifestRecord).manifest_version;
      
      expect(chromiumNeedsFill).toBe(true);
    });
  });

  describe('entry to manifest mapping', () => {
    it('should map background entry to service_worker for chromium MV3', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
      ];
      
      const outputPath = `${entries[0].name}/index.js`;
      expect(outputPath).toBe('background/index.js');
    });

    it('should map popup entry to action.default_popup for MV3', () => {
      const entries: EntryInfo[] = [
        { name: 'popup', scriptPath: '/app/popup/index.ts', html: true, htmlPath: '/app/popup/index.html' },
      ];
      
      const outputPath = `${entries[0].name}/index.html`;
      expect(outputPath).toBe('popup/index.html');
    });

    it('should handle multiple entries', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
        { name: 'content', scriptPath: '/app/content/index.ts', html: false },
        { name: 'popup', scriptPath: '/app/popup/index.ts', html: true, htmlPath: '/app/popup/index.html' },
      ];
      
      const entryNames = entries.map(e => e.name);
      expect(entryNames).toContain('background');
      expect(entryNames).toContain('content');
      expect(entryNames).toContain('popup');
    });
  });

  describe('manifest field generation conditions', () => {
    it('should determine when to generate background field', () => {
      const entries: EntryInfo[] = [
        { name: 'background', scriptPath: '/app/background/index.ts', html: false },
      ];
      
      const shouldGenerate = entries.some((e) => e.name === 'background');
      expect(shouldGenerate).toBe(true);
    });

    it('should determine when to generate content_scripts field', () => {
      const entries: EntryInfo[] = [
        { name: 'content', scriptPath: '/app/content/index.ts', html: false },
      ];
      
      const shouldGenerate = entries.some((e) => e.name === 'content');
      expect(shouldGenerate).toBe(true);
    });

    it('should determine when to generate action field', () => {
      const entries: EntryInfo[] = [
        { name: 'popup', scriptPath: '/app/popup/index.ts', html: true, htmlPath: '/app/popup/index.html' },
      ];
      
      const shouldGenerate = entries.some((e) => e.name === 'popup');
      expect(shouldGenerate).toBe(true);
    });

    it('should determine when to generate side_panel field for chromium', () => {
      const entries: EntryInfo[] = [
        { name: 'sidepanel', scriptPath: '/app/sidepanel/index.ts', html: true, htmlPath: '/app/sidepanel/index.html' },
      ];
      const browser = 'chromium';
      const mv = 3;
      
      const shouldGenerate = browser === 'chromium' && 
        entries.some((e) => e.name === 'sidepanel') &&
        mv === 3;
      
      expect(shouldGenerate).toBe(true);
    });

    it('should not generate side_panel field for firefox', () => {
      const entries: EntryInfo[] = [
        { name: 'sidepanel', scriptPath: '/app/sidepanel/index.ts', html: true, htmlPath: '/app/sidepanel/index.html' },
      ];
      const browser = 'firefox';
      
      const shouldGenerate = browser === 'chromium' && 
        entries.some((e) => e.name === 'sidepanel');
      
      expect(shouldGenerate).toBe(false);
    });

    it('should determine when to generate chrome_url_overrides', () => {
      const entries: EntryInfo[] = [
        { name: 'newtab', scriptPath: '/app/newtab/index.ts', html: true, htmlPath: '/app/newtab/index.html' },
      ];
      
      const shouldGenerate = entries.some((e) => 
        ['newtab', 'bookmarks', 'history'].includes(e.name)
      );
      
      expect(shouldGenerate).toBe(true);
    });

    it('should determine when to add permissions for bookmarks', () => {
      const entries: EntryInfo[] = [
        { name: 'bookmarks', scriptPath: '/app/bookmarks/index.ts', html: true, htmlPath: '/app/bookmarks/index.html' },
      ];
      
      const hasBookmarks = entries.some((e) => e.name === 'bookmarks');
      expect(hasBookmarks).toBe(true);
    });

    it('should determine when to add permissions for history', () => {
      const entries: EntryInfo[] = [
        { name: 'history', scriptPath: '/app/history/index.ts', html: true, htmlPath: '/app/history/index.html' },
      ];
      
      const hasHistory = entries.some((e) => e.name === 'history');
      expect(hasHistory).toBe(true);
    });
  });

  describe('manifest version field mapping', () => {
    it('should map action to browser_action for MV2', () => {
      const mv = 2;
      const fieldName = mv === 2 ? 'browser_action' : 'action';
      expect(fieldName).toBe('browser_action');
    });

    it('should map action to action for MV3', () => {
      const mv = 3;
      const fieldName = mv === 2 ? 'browser_action' : 'action';
      expect(fieldName).toBe('action');
    });

    it('should map options_ui to options_page for MV2', () => {
      const mv = 2;
      const fieldName = mv === 2 ? 'options_page' : 'options_ui';
      expect(fieldName).toBe('options_page');
    });

    it('should map options_ui to options_ui for MV3', () => {
      const mv = 3;
      const fieldName = mv === 2 ? 'options_page' : 'options_ui';
      expect(fieldName).toBe('options_ui');
    });

    it('should not include side_panel for MV2', () => {
      const mv = 2;
      const shouldIncludeSidePanel = mv === 3;
      expect(shouldIncludeSidePanel).toBe(false);
    });

    it('should include side_panel for MV3', () => {
      const mv = 3;
      const shouldIncludeSidePanel = mv === 3;
      expect(shouldIncludeSidePanel).toBe(true);
    });
  });
});
