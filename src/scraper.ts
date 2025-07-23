import { chromium } from 'playwright';
import { generateExcel } from './generateExcel.js';
import dotenv from 'dotenv';
dotenv.config();

import { refreshAuth } from './refreshAuth.js';
import { fetchObservationLinks } from './fetchObservationLinks.js';
import { logError, clearLogIfEmpty } from './logger.js';
import { scrapeObsPageInfo } from './scrapeObsPageInfo.js';
import fs from 'fs';
import path from 'path';
import { getLinksToScrape } from './fileSanity.js';


import promptSync from 'prompt-sync';
const prompt = promptSync();

const fetchedPath = './fetched-links.json';
const failedPath = './failed-links.json';
const outputPath = './scraped-observations.json';

// Ensure all required JSON files exist
const fileDefaults: Record<string, any> = {
    'fetched-links.json': [],
    'failed-links.json': [],
    'scraped-observations.json': [],
};

for (const [filename, defaultValue] of Object.entries(fileDefaults)) {
    const fullPath = path.resolve(filename);
    if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, JSON.stringify(defaultValue, null, 2));
    }
}

let isShuttingDown = false;
let currentLink: string | null = null;

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

function handleShutdown(signal: string) {
    console.log(`\n🛑 Received ${signal}, saving progress and shutting down...`);
    isShuttingDown = true;

    if (currentLink) {
        console.log(`🔃 Last attempted link: ${currentLink}`);
    }

    process.exit(); // safely quit
}

function showMenu() {
  console.log('\n=== Observation Scraper Menu ===');
  console.log('1. Fetch and save observation links');
  console.log('2. Refresh Auth');
  console.log('3. Scrape observations from saved links');
  console.log('4. Generate Excel from scraped observations');
  console.log('q. Quit');
}


async function scrapeObservations(){
    console.log("Observation Scraping Initiated");

    const linksToScrape = getLinksToScrape();
    const total = linksToScrape.length;
    let completed = 0;
    console.log(`📦 Total links to scrape this run: ${total}`);
    const failedLinks = fs.existsSync(failedPath) ? JSON.parse(fs.readFileSync(failedPath, 'utf-8')) : [];

    const browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
        storageState: 'auth.json',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        locale: 'en-US',
    });

    const page = await context.newPage();

    for (let i = 0; i < linksToScrape.length; i++) {
        //Graceful shutdown check
        if (isShuttingDown){
            await browser.close();
            break;
        }
        currentLink = linksToScrape[i];

        const link = linksToScrape[i];
        try {
            const observationData = await scrapeObsPageInfo(page, link);
            if (observationData) {
                fs.appendFileSync(outputPath, JSON.stringify(observationData) + '\n');

                linksToScrape.splice(i, 1); // Remove current link
                fs.writeFileSync(fetchedPath, JSON.stringify(linksToScrape, null, 2));
                
                completed++;
                const percentage = ((completed / total) * 100).toFixed(2);

                console.log(`✅ (${completed}/${total}) ${percentage}% done - Scraped: ${link}`);
                i--; // Adjust index since we removed an element
            } else {
                throw new Error(`observationData is null for link: ${link}`);
            }
        } catch (error) {
            console.error(`❌ Failed to scrape: ${link}`, error);
            logError('Scraping observation failed', link, error);

            if (!failedLinks.includes(link)) {
                failedLinks.push(link);
                fs.writeFileSync(failedPath, JSON.stringify(failedLinks, null, 2));
            }
        }
    }

    await browser.close();

    console.log(`\nScraping completed: ${completed} successful, ${failedLinks.length} failed.`);

}

let exit = false;

while (!exit) {
  showMenu();
  const choice = prompt('Select an option: ').trim();

  switch (choice) {
    case '1':
        const searchUrl = prompt('Enter the search URL (or leave blank for default): ').trim() || null;

        const breakPointInput = prompt('Enter page limit (0 for no limit): ').trim();
        const parsed = Number(breakPointInput);
        const breakPoint = breakPointInput.trim() === '' || isNaN(parsed) ? 1 : parsed;

        //set default URL if input is null or empty
        const inputUrl = searchUrl?.trim() || 'https://waarnemingen.be/species/197583/photos/?date_after=2022-01-01&date_before=2025-12-31';

        await fetchObservationLinks(inputUrl, breakPoint);
        break;

    case '2':
        await refreshAuth();
    break;

    case '3':
        await scrapeObservations();
    break;

    case '4':
        await generateExcel();
    break;

    case 'q':
    case 'Q':
      exit = true;
      console.log('Goodbye!');
      break;

    default:
      console.log('❌ Invalid option. Try again.');
  }
}

try {
    // const observationLinks: Set<string> = await fetchObservationLinks();
    // scrapeObservations(observationLinks);
}
catch (error) {
    console.error("Error in main: ", error);
    logError("Error in main", "scraper.ts", error);
    process.exit(1); // Exit if we can't fetch links

}


clearLogIfEmpty();

