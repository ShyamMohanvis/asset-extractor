const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { ZipArchive } = require("archiver");

function safePath(urlString) {
    const url = new URL(urlString);
    let filePath = url.pathname;
    if (filePath.endsWith("/")) {
        filePath += "index.html";
    }
    filePath = filePath.replace(/^\/+/, "");
    filePath = filePath.replace(/[<>:"|?*]/g, "_");
    return filePath;
}

async function scrapeGame(targetUrl, targetDomain, jobId, onUpdate) {
    const OUTPUT_DIR = path.resolve(__dirname, "downloads", jobId);
    
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    onUpdate('status', 'launching_browser');
    onUpdate('log', 'Launching headless browser...');

    const browser = await chromium.launch({
        headless: true // Keep it invisible for API usage
    });

    const context = await browser.newContext();

    context.on("response", async response => {
        const url = response.url();
        try {
            const parsed = new URL(url);
            
            // Only capture the target domain
            if (!parsed.hostname.endsWith(targetDomain)) {
                return;
            }
            if (response.status() !== 200) {
                return;
            }

            const relPath = safePath(url);
            const destination = path.join(OUTPUT_DIR, relPath);

            fs.mkdirSync(path.dirname(destination), { recursive: true });

            const body = await response.body();
            fs.writeFileSync(destination, body);

            onUpdate('file', url);
        } catch (err) {
            // ignore
        }
    });

    const page = await context.newPage();
    onUpdate('status', 'navigating');
    onUpdate('log', 'Opening ' + targetUrl + '...');

    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

    onUpdate('log', 'Waiting 5 seconds for initial load...');
    await page.waitForTimeout(5000);

    onUpdate('log', 'Attempting to click Play buttons...');
    const buttons = ["text=Play", "[aria-label='Play']", "button", ".play-button", "#play"];
    for (const selector of buttons) {
        try {
            const element = page.locator(selector).first();
            if (await element.isVisible({ timeout: 1000 })) {
                await element.click();
                onUpdate('log', `Clicked: ${selector}`);
                break;
            }
        } catch {}
    }

    onUpdate('status', 'capturing');
    onUpdate('log', 'Waiting 20 seconds for game resources to load and intercept...');
    await page.waitForTimeout(20000);

    await browser.close();
    onUpdate('status', 'zipping');
    onUpdate('log', 'Archiving files into a zip...');

    // Zip the downloaded directory
    const zipPath = path.resolve(__dirname, "downloads", `${jobId}.zip`);
    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = new ZipArchive({ zlib: { level: 9 } });
        
        output.on('close', resolve);
        archive.on('error', reject);
        
        archive.pipe(output);
        archive.directory(OUTPUT_DIR, false);
        archive.finalize();
    });

    onUpdate('log', 'Finished successfully. Ready for download!');
    return zipPath;
}

module.exports = { scrapeGame };
