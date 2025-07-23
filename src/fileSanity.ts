import fs from 'fs';
import path from 'path';

const fetchedPath = './fetched-links.json';
const outputPath = './scraped-observations.json';

/** Safely load a Set<string> from a JSON array (file should contain string[]). */
export function loadLinksFromFile(filePath: string): Set<string> {
    if (!fs.existsSync(filePath)) return new Set();

    const content = fs.readFileSync(filePath, 'utf-8').trim();
    if (!content) return new Set();

    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            return new Set(parsed.filter(link => typeof link === 'string'));
        }
    } catch (err) {
        console.error(`❌ Failed to parse JSON from ${filePath}`, err);
    }

    return new Set();
}

/** Safely load a Set<string> from a JSON array of objects with a `.link` field. */
export function loadScrapedLinks(scrapedPath: string): Set<string> {
    if (!fs.existsSync(scrapedPath)) return new Set();

    try {
        const lines = fs.readFileSync(scrapedPath, 'utf-8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0); // 🛡️ Remove empty lines

        const links = [];

        for (const line of lines) {
            try {
                const obj = JSON.parse(line);
                if (obj?.link && typeof obj.link === 'string') {
                    links.push(obj.link);
                }
            } catch (err) {
                console.warn(`⚠️ Skipped invalid JSON line: ${line}`);
            }
        }

        return new Set(links);
    } catch (err) {
        console.error(`❌ Failed to read or parse ${scrapedPath}`, err);
        return new Set(); // Fallback
    }
}

export function getLinksToScrape(): string[] {
    const fetchedPath = path.resolve('fetched-links.json');
    const scrapedPath = path.resolve('scraped-observations.json');
    const failedPath = path.resolve('failed-links.json');

    const fetched = loadLinksFromFile(fetchedPath);
    const failed = loadLinksFromFile(failedPath);
    const scraped = loadScrapedLinks(scrapedPath);

    // ✅ Remove scraped links from fetched
    for (const link of scraped) {
        fetched.delete(link);
    }

    // ✅ Merge failed into cleaned fetched
    for (const link of failed) {
        fetched.add(link);
    }

    // ✅ Overwrite fetched-links.json with cleaned version
    fs.writeFileSync(fetchedPath, JSON.stringify([...fetched], null, 2));

    // ✅ Clear failed-links.json for this runtime
    fs.writeFileSync(failedPath, JSON.stringify([], null, 2));

    return [...fetched];
}


