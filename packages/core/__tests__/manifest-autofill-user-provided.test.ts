import { describe, it, expect } from '@rstest/core';
import type { EntryInfo, ManifestRecord } from '../src/types.ts';
import { autoFillManifestFields, hasRequiredFields } from '../src/manifest/generator.ts';

describe('autoFillManifestFields - user provided manifest with missing fields', () => {
  const mockEntries: EntryInfo[] = [
    { name: 'background', scriptPath: '/app/background/index.ts', html: false },
    { name: 'content', scriptPath: '/app/content/index.ts', html: false },
    { name: 'popup', scriptPath: '/app/popup/index.ts', html: true, htmlPath: '/app/popup/index.html' },
  ];

  describe('必填字段自动补充', () => {
    it('当用户只提供 name 时，应自动补充 manifest_version 和 version', () => {
      const userManifest: ManifestRecord = {
        name: 'My Extension',
      };

      const filled = autoFillManifestFields(userManifest, mockEntries, 'chromium');

      expect(filled.name).toBe('My Extension'); // Preserves user-provided value
      expect(filled.manifest_version).toBe(3); // Auto-filled
      expect(filled.version).toBe('1.0.0'); // Auto-filled
      expect(hasRequiredFields(filled)).toBe(true);
    });

    it('当用户只提供 version 时，应自动补充 manifest_version 和 name', () => {
      const userManifest: ManifestRecord = {
        version: '2.0.0',
      };

      const filled = autoFillManifestFields(userManifest, mockEntries, 'chromium');

      expect(filled.version).toBe('2.0.0'); // Preserves user-provided value
      expect(filled.manifest_version).toBe(3); // Auto-filled
      expect(filled.name).toBe('Extension'); // Auto-filled
      expect(hasRequiredFields(filled)).toBe(true);
    });

    it('当用户只提供 manifest_version 时，应自动补充 name 和 version', () => {
      const userManifest: ManifestRecord = {
        manifest_version: 2,
      };

      const filled = autoFillManifestFields(userManifest, mockEntries, 'chromium');

      expect(filled.manifest_version).toBe(2); // Preserves user-provided value
      expect(filled.name).toBe('Extension'); // Auto-filled
      expect(filled.version).toBe('1.0.0'); // Auto-filled
      expect(hasRequiredFields(filled)).toBe(true);
    });

    it('当用户提供空字符串时应自动补充默认值', () => {
      const userManifest: ManifestRecord = {
        name: '',
        version: '',
        manifest_version: undefined as unknown as number,
      };

      const filled = autoFillManifestFields(userManifest, mockEntries, 'chromium');

      expect(filled.name).toBe('Extension');
      expect(filled.version).toBe('1.0.0');
      expect(filled.manifest_version).toBe(3);
      expect(hasRequiredFields(filled)).toBe(true);
    });

    it('当用户什么都不提供时应自动补充所有必填字段', () => {
      const userManifest: ManifestRecord = {};

      const filled = autoFillManifestFields(userManifest, mockEntries, 'chromium');

      expect(filled.manifest_version).toBe(3);
      expect(filled.name).toBe('Extension');
      expect(filled.version).toBe('1.0.0');
      expect(hasRequiredFields(filled)).toBe(true);
    });
  });

  describe('用户值优先级', () => {
    it('应保留用户提供的所有值，只填充缺失的字段', () => {
      const userManifest: ManifestRecord = {
        manifest_version: 2,
        name: 'Custom Extension',
        version: '3.0.0',
      };

      const filled = autoFillManifestFields(userManifest, mockEntries, 'chromium');

      expect(filled.manifest_version).toBe(2);
      expect(filled.name).toBe('Custom Extension');
      expect(filled.version).toBe('3.0.0');
    });

    it('应保留用户的 permissions 和添加必要的权限', () => {
      const userManifest: ManifestRecord = {
        name: 'Test',
        version: '1.0.0',
        manifest_version: 3,
        permissions: ['storage', 'activeTab'],
      };

      const filled = autoFillManifestFields(userManifest, mockEntries, 'chromium');

      const perms = filled.permissions as string[];
      expect(perms).toContain('storage'); // Preserves user-provided value
      expect(perms).toContain('activeTab'); // Preserves user-provided value
    });
  });

  describe('Entry 相关字段自动填充', () => {
    it('当用户 manifest 缺少 background 时应自动填充', () => {
      const userManifest: ManifestRecord = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
      };

      const filled = autoFillManifestFields(userManifest, mockEntries, 'chromium');

      expect(filled.background).toEqual({ service_worker: 'background/index.js' });
    });

    it('当用户 manifest 有 background 时不应覆盖', () => {
      const userManifest: ManifestRecord = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        background: { service_worker: 'custom-background.js' },
      };

      const filled = autoFillManifestFields(userManifest, mockEntries, 'chromium');

      expect(filled.background).toEqual({ service_worker: 'custom-background.js' });
    });

    it('当用户 manifest 缺少 content_scripts 时应自动填充', () => {
      const userManifest: ManifestRecord = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
      };

      const filled = autoFillManifestFields(userManifest, mockEntries, 'chromium');

      expect(filled.content_scripts).toBeDefined();
      expect(Array.isArray(filled.content_scripts)).toBe(true);
    });

    it('当用户 manifest 缺少 action 时应自动填充', () => {
      const userManifest: ManifestRecord = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
      };

      const filled = autoFillManifestFields(userManifest, mockEntries, 'chromium');

      expect(filled.action).toEqual({ default_popup: 'popup/index.html' });
    });
  });

  describe('浏览器适配', () => {
    it('Firefox MV3 应使用 background.scripts 而不是 service_worker', () => {
      const userManifest: ManifestRecord = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
      };

      const filled = autoFillManifestFields(userManifest, mockEntries, 'firefox');

      expect(filled.background).toEqual({ scripts: ['background/index.js'] });
    });

    it('Chromium MV2 应使用 browser_action 而不是 action', () => {
      const entriesWithPopup: EntryInfo[] = [
        { name: 'popup', scriptPath: '/app/popup/index.ts', html: true, htmlPath: '/app/popup/index.html' },
      ];
      const userManifest: ManifestRecord = {
        manifest_version: 2,
        name: 'Test',
        version: '1.0.0',
      };

      const filled = autoFillManifestFields(userManifest, entriesWithPopup, 'chromium');

      expect(filled.browser_action).toBeDefined();
      expect(filled.action).toBeUndefined();
    });
  });

  describe('权限自动补充', () => {
    it('有 side_panel 时应自动添加 sidePanel 权限', () => {
      const userManifest: ManifestRecord = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        side_panel: { default_path: 'sidepanel/index.html' },
      };

      const filled = autoFillManifestFields(userManifest, [], 'chromium');

      const perms = filled.permissions as string[];
      expect(perms).toContain('sidePanel');
    });

    it('有 chrome_url_overrides.bookmarks 时应自动添加 bookmarks 权限', () => {
      const userManifest: ManifestRecord = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        chrome_url_overrides: { bookmarks: 'bookmarks/index.html' },
      };

      const filled = autoFillManifestFields(userManifest, [], 'chromium');

      const perms = filled.permissions as string[];
      expect(perms).toContain('bookmarks');
    });

    it('有 chrome_url_overrides.history 时应自动添加 history 权限', () => {
      const userManifest: ManifestRecord = {
        manifest_version: 3,
        name: 'Test',
        version: '1.0.0',
        chrome_url_overrides: { history: 'history/index.html' },
      };

      const filled = autoFillManifestFields(userManifest, [], 'chromium');

      const perms = filled.permissions as string[];
      expect(perms).toContain('history');
    });
  });
});
