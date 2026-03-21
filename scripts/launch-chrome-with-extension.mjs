/**
 * 使用 Puppeteer 启动 Chrome，加载指定扩展，并打开 chrome://extensions。
 * 启动后断开连接，浏览器保持打开，不再受脚本控制。
 *
 * 用法: node scripts/launch-chrome-with-extension.mjs [扩展目录]
 * 默认扩展目录: examples/vue-template/dist
 *
 * @see https://pptr.dev/guides/chrome-extensions
 */
import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const extensionDir = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(root, "examples", "vue-template", "dist");

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    pipe: true,
    enableExtensions: [extensionDir],
  });

  const page = await browser.newPage();
  await page.goto("chrome://extensions");

  browser.disconnect();
  console.log("Chrome 已启动并打开 chrome://extensions，扩展目录:", extensionDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
