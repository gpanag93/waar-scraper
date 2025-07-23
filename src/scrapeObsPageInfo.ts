import { getLocationInfo } from './getLocationInfo.js';
import { Page } from 'playwright';
import { logError } from './logger.js';

export async function scrapeObsPageInfo(page: Page, link: string) {
    const url = `https://waarnemingen.be${link}`;
    console.log(`Scraping link: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    //date
    const rawDate = await page.locator('#observation_details tr:has(th:text("Date")) td').textContent();
    let date = '';
    if (rawDate) {
        const datePart = rawDate.trim().split(' ')[0];
        const dateObj = new Date(datePart);

        if (!isNaN(dateObj.getTime())) {
            // Format: DD-MM-YY
            date =
            String(dateObj.getDate()).padStart(2, '0') + '-' +
            String(dateObj.getMonth() + 1).padStart(2, '0') + '-' +
            String(dateObj.getFullYear()).slice(2);

        }
    }

    //number and sex
    // Locate the table row with <th>Number</th>
    const numberRow = await page.locator('#observation_details tr:has(th:text("Number"))');

    const tdLocator = numberRow.locator('td');

    // Extract all numeric mentions in the <td> (e.g., "1 imago", "1 imago")
    const tdText = await tdLocator.innerText();
    const numberMatches = tdText.match(/\b\d+\b/g) || [];

    if (numberMatches.length > 1) {
        throw new Error('⚠️ Multiple individuals detected in Number row — complex/mixed observation.');
    }

    // Extract the number (text before any <i> tag inside the <td>)
    const numberText = await numberRow.locator('td').evaluate((td) => {
        const text = td.childNodes[0]?.textContent?.trim() || '';
        return text;
    });

    // Extract the sex icon title if it exists
    const icon = numberRow.locator('td i[title]');
    let sexIconName: string | null = null;

    if (await icon.count() > 0) {
        sexIconName = await icon.first().getAttribute('title'); // will be 'male' or 'female'
    }

    // Now you have both values
    const sex = sexIconName ?? 'NULL';

    //life_stage (database)
    const lifeStageLocator = page.locator('#observation_details tr:has(th:text("Life stage")) td');
    const lifeStage = (await lifeStageLocator.count()) > 0
        ? (await lifeStageLocator.innerText()).trim()
        : null;

    //country location province
    const locationLinkLocator = page.locator('#observation_details tr:has(th:text("Location")) td a');
    const locationHref = (await locationLinkLocator.count()) > 0
        ? (await locationLinkLocator.getAttribute('href'))?.trim() ?? null
        : null;

    const locationInfo = locationHref ? await getLocationInfo(locationHref) : { country: null, location: null, province: null };
    const country = locationInfo.country;
    const location = locationInfo.location;
    const province = locationInfo.province;

    //Lambert 1972: x (Ea) and y(N)
    const lambertLocator = page.locator('span.teramap-coordinates[title="BD72 / Belgian Lambert 72"] span.teramap-coordinates-coords');
    let lambertText: string | null = null;
    if (await lambertLocator.count() > 0) {
        try {
            lambertText = (await lambertLocator.innerText()).trim();
        } catch {
            lambertText = null;
        }
    }

    const [xEa, yN] = lambertText ? lambertText.split(' ') : [null, null];

    // GPS Latitude and Longitude
    const gpsLocator = page.locator('span.teramap-coordinates[title="WGS 84"] span.teramap-coordinates-coords');
    let gpsText: string | null = null;
    if (await gpsLocator.count() > 0) {
        try {
            gpsText = (await gpsLocator.innerText()).trim();
        } catch {
            gpsText = null;
        }
    }

    const [latitudeStr, longitudeStr] = gpsText ? gpsText.split(',').map(s => s.trim()) : [null, null];

    // activity
    const activityLocator = page.locator('#observation_details tr:has(th:text("Activity")) td');

    if (await activityLocator.count() === 0) {
        throw new Error('❌ Activity field not found on observation page.');
    }

    const activity = (await activityLocator.innerText()).trim();

    //on/in
    const onInLocator = page.locator('#observation_details tr:has(th:text("On/in")) td');

    const hostPlants = (await onInLocator.count()) > 0
    ? (await onInLocator.evaluate(td => {
        return Array.from(td.childNodes)
            .map(node => node.textContent?.trim())
            .filter(text => text)
            .join(' - ');
        }))
    : null;

    //comments flag
    const hasComments = await page.locator('h4 > a[name="comments"]').count() > 0;

    //link -> url

    if (!date || !numberText || !activity){
            const errorMsg = `Error Scraping info from observation: ${link}
                Missing information for URL:\n ${url}
                numberText: ${numberText}
                sex: ${sex}
                lifeStage: ${lifeStage}
                country: ${country}
                location: ${location}
                province: ${province}
                xEa: ${xEa}
                yN: ${yN}
                latitude: ${latitudeStr}
                longitude: ${longitudeStr}
                activity: ${activity}
                onIn: ${hostPlants}
                hasComments: ${(hasComments) ? 'Yes' : 'No'}
                link: ${url}`;
            
            console.error(errorMsg);
            throw new Error(errorMsg);
    } else {
        console.log(`Observation scraped from: ${url}\n
            date: ${date}
            numberText: ${numberText}
            sex: ${sex}
            lifeStage: ${lifeStage}
            country: ${country}
            location: ${location}
            province: ${province}
            xEa: ${xEa}
            yN: ${yN}
            latitude: ${latitudeStr}
            longitude: ${longitudeStr}
            activity: ${activity}
            onIn: ${hostPlants}
            hasComments: ${(hasComments) ? 'Yes' : 'No'}
            link: ${url}
            `
        );
        const observationData = {
            link,
            date,
            numberText,
            sex,
            lifeStage,
            country,
            location,
            province,
            xEa,
            yN,
            latitude: latitudeStr,
            longitude: longitudeStr,
            activity,
            onIn: hostPlants,
            hasComments,
            url: url,
        };

        return observationData;
    }

}