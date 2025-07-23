import { chromium } from 'playwright';
import path from 'path';
import dotenv from 'dotenv';
import { logError } from './logger.js';
import fs from 'fs';
import { loadLinksFromFile, loadScrapedLinks } from './fileSanity.js';
const outputPath = path.resolve('fetched-links.json');

dotenv.config();

export async function fetchObservationLinks(
    inputUrl: string | null = null,
    breakPoint: number 
) {
    console.log("Scraper Initiated");
    console.log("Current working directory:", process.cwd());
    console.log("Looking for auth.json in:", path.resolve('auth.json'));

    console.log("Loading saved links from fetched and scraped..");
    const fetchedPath = path.resolve('fetched-links.json');
    const scrapedPath = path.resolve('scraped-observations.json');

    const fetchedSet = loadLinksFromFile(fetchedPath);
    const scrapedSet = loadScrapedLinks(scrapedPath);
    console.log(".. Loaded");

    
    const browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
        storageState: 'auth.json',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        locale: 'en-US',
    });

    const page = await context.newPage();

    let pageNumber = 1;

    while (true) {
        const url = inputUrl + `&page=${pageNumber}`;
        console.log(`Scraping page ${pageNumber}: ${url}`);
        try{
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });


            // grab all <a> elements with href matching /observation/xxxxx/
            const anchors = await page.$$('a[href^="/observation/"]');

            let newLinksFound = false;

            for (const anchor of anchors) {
                const href = await anchor.getAttribute('href');

                if (!href) {
                    logError("fetchObservationLinks", url, "observation link is empty");
                    continue;
                }

                if (
                    !fetchedSet.has(href) &&
                    !scrapedSet.has(href)
                ) {
                    fetchedSet.add(href);
                    console.log(`Found new link: ${href}`);
                    newLinksFound = true;
                }
            }

            if (newLinksFound) {
                fs.writeFileSync(outputPath, JSON.stringify([...fetchedSet], null, 2));
            }

            const isLastPage = await page.$('ul.pagination li.last.disabled');
            
            if (isLastPage || pageNumber === breakPoint) {
                console.log("🛑 Reached the last page.");
                break;
            }else {
                // go to the next page
                pageNumber++;
            }

            await new Promise((r) => setTimeout(r, 500 + Math.random() * 3000));

        }catch (error) {
            console.error(`Error scraping page ${pageNumber}:`, error);
            logError("Observation Link scraping", `${pageNumber}`, error) // stop if there's an error (e.g. page not found)
        }

        
    }

    // console.log('Found observation links:', Array.from(links));
    console.log(`Total number of observation Links: ${fetchedSet.size}`);
    await browser.close();
}