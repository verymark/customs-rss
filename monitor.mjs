import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const BASE = process.cwd();
const STATE_FILE = path.join(BASE, 'state.json');
const FEED_FILE = path.join(BASE, 'feed.xml');
const TARGET_URL = 'http://www.customs.gov.cn/customs/302249/zfxxgk/fdzdgknr/302274/index.html';

function loadState() {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function nowIso() {
  return new Date().toISOString();
}

function nowRfc2822() {
  return new Date().toUTCString();
}

function xmlEscape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function addFeedItem(title, description) {
  const xml = fs.readFileSync(FEED_FILE, 'utf8');
  const item = `\n    <item>\n      <title>${xmlEscape(title)}</title>\n      <link>${xmlEscape(TARGET_URL)}</link>\n      <guid>customs-monitor-${Date.now()}</guid>\n      <pubDate>${xmlEscape(nowRfc2822())}</pubDate>\n      <description><![CDATA[${description}]]></description>\n    </item>`;

  const updated = xml
    .replace(/<lastBuildDate>[\s\S]*?<\/lastBuildDate>/, `<lastBuildDate>${xmlEscape(nowRfc2822())}</lastBuildDate>`)
    .replace(/(<channel>)/, `$1${item}`);

  fs.writeFileSync(FEED_FILE, updated, 'utf8');
}

function gitHasChanges() {
  try {
    const out = execSync('git status --porcelain', { cwd: BASE, encoding: 'utf8' }).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

async function fetchSignature() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  });

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(8000);

    const result = await page.evaluate(() => {
      const title = document.title || '';
      const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
      const anchors = Array.from(document.querySelectorAll('a'))
        .map(a => ({ text: (a.textContent || '').replace(/\s+/g, ' ').trim(), href: a.href || '' }))
        .filter(x => x.text || x.href)
        .slice(0, 200);
      return { title, bodyText, anchors };
    });

    await browser.close();

    const signatureObj = {
      title: result.title,
      bodyPreview: result.bodyText.slice(0, 4000),
      anchors: result.anchors,
    };

    return JSON.stringify(signatureObj, null, 2);
  } catch (err) {
    await browser.close();
    throw err;
  }
}

async function main() {
  const state = loadState();
  const signature = await fetchSignature();
  const newHash = sha256(signature);
  const oldHash = state.last_hash || null;

  if (newHash === oldHash) {
    console.log('NO_CHANGE');
    return;
  }

  addFeedItem(
    '海关总署页面发生变化',
    `检测到目标页面签名发生变化。\n\n更新时间：${nowIso()}\n说明：当前 RSS 仅做变化通知，不保存正文。`
  );

  state.last_hash = newHash;
  state.last_text = signature.slice(0, 1000);
  state.last_checked = nowIso();
  saveState(state);

  console.log(gitHasChanges() ? 'UPDATED' : 'UPDATED_BUT_NO_GIT_DIFF');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
