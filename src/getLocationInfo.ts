import { chromium } from 'playwright';
import { logError } from './logger.js';

export async function getLocationInfo(locationHref: string | null) {
    if (!locationHref) {
        logError("Empty location URL", "getLocationInfo", "No location URL provided");
        return { country: null, location: null, province: null };
    }

    const url = `https://waarnemingen.be${locationHref}`;
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        storageState: 'auth.json',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        locale: 'en-US',
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Scope all selectors to the specific table
    const table = page.locator('table.table-compact');

    // Location (from <th>Name</th>)
    const location = (await table.locator('tr:has(th:text("Name")) td').first().innerText()).trim();

    // Country (from <th>Country</th> > td > a)
    const countryLocator = table.locator('tr:has(th:text("Country")) td a');
    const country = (await countryLocator.count()) > 0
    ? (await countryLocator.first().innerText()).trim()
    : null;

    // Province (from <th>Province</th> > td > a)
    const provinceLocator = table.locator('tr:has(th:text("Province")) td a');
    const province = (await provinceLocator.count()) > 0
    ? (await provinceLocator.first().innerText()).trim()
    : null;

    await browser.close();
    if (!location || !country || !province) {
        logError('Error Scraping info from location', locationHref, `Missing location, country, or province information for URL:\n ${url}\nLocation: ${location}\nCountry: ${country}\nProvince: ${province}`);
    }
    return { country, location, province };
}