const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = process.env.URL || 'http://localhost:8081/';
  const outDir = process.env.OUTDIR || 'tmp';
  try {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    // Allow overriding executable path via EXECUTABLE_PATH env var.
    // If not provided, try common Chrome locations on Windows.
    const execPath = process.env.EXECUTABLE_PATH || (() => {
      const possibles = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Chromium\\Application\\chrome.exe',
      ];
      for (const p of possibles) {
        try {
          if (fs.existsSync(p)) return p;
        } catch (e) {}
      }
      return undefined;
    })();

    const launchOpts = { args: ['--no-sandbox', '--disable-setuid-sandbox'] };
    if (execPath) launchOpts.executablePath = execPath;
    const browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();

    const logs = [];
    page.on('console', msg => {
      const text = `${msg.type().toUpperCase()}: ${msg.text()}`;
      logs.push(text);
      console.log(text);
    });

    page.on('pageerror', err => {
      const text = `PAGE_ERROR: ${err.toString()}`;
      logs.push(text);
      console.error(text);
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // wait a bit for app to render
    await page.waitForTimeout(1500);

    const html = await page.content();
    fs.writeFileSync(`${outDir}/page.html`, html, 'utf8');

    const screenshotPath = `${outDir}/screenshot.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    fs.writeFileSync(`${outDir}/console.log`, logs.join('\n'), 'utf8');

    console.log('Headless check complete. Files saved to', outDir);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Headless check failed:', err);
    process.exit(2);
  }
})();
