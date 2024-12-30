var https = require('https');
const fs = require('fs').promises;
const { URL } = require('url');

async function readJsonFile(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
}

async function writeJsonFile(data, filePath) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function checkRedirects(originalFile, stagingFile) {
    try {
        const originalLinks = await readJsonFile(originalFile);
        const stagingLinks = await readJsonFile(stagingFile);
        const removed_original_links = [];
        const removed_staging_links = [];

        const check = async (url, removedLinksArray) => {
            try {
                const agent = new https.Agent({ rejectUnauthorized: false });
                const { default: fetch } = await import('node-fetch');
                const response = await fetch(url, { method: "get", agent });

                if (response.ok) {
                    const urlDomain = new URL(url).hostname;
                    const responseDomain = new URL(response.url).hostname;

                    if (urlDomain === responseDomain) {
                        removedLinksArray.push(url);
                    }
                } else if (response.status === 301 || 302) {
                    const redirectUrl = response.headers.get('location');
                    if (redirectUrl) {
                        await check(redirectUrl, removedLinksArray);
                    }
                }
            } catch (error) {
                // console.error(`Error fetching ${url}:`, error);
            }
        };

        const processLinks = async (links, removedLinksArray) => {
            const promises = links.map(url => check(url, removedLinksArray));
            await Promise.all(promises);
        };

        await Promise.all([
            processLinks(originalLinks, removed_original_links),
            processLinks(stagingLinks, removed_staging_links)
        ]);

        const { matchingOriginalUrls, matchingStagingUrls } = await compareAndWriteMatchingUrls(removed_original_links, removed_staging_links);

        console.log(`Original:`);
        console.log(`Total Links in Original File: ${originalLinks.length}`);
        console.log(`After Removing External Links in Original File: ${removed_original_links.length}`);
        console.log(`External Links in Original File: ${originalLinks.length - removed_original_links.length}`);

        console.log(`Staging:`);
        console.log(`Total Links in Staging File: ${stagingLinks.length}`);
        console.log(`After removing External Links in Staging File: ${removed_staging_links.length}`);
        console.log(`External Links in Staging File: ${stagingLinks.length - removed_staging_links.length}`);

        console.log('Overall Counts:');
        console.log(`Total Matching Links after excluding external links Count: ${matchingOriginalUrls.length}`);

        await sortUrls();
    } catch (error) {
        console.error('Error:', error);
    }
}

async function compareAndWriteMatchingUrls(originalUrls, stagingUrls) {
    const matchingOriginalUrls = [];
    const matchingStagingUrls = [];

    const stagingUrlMap = new Map();
    for (const url of stagingUrls) {
        const urlObj = new URL(url);
        stagingUrlMap.set(urlObj.pathname, url);
    }

    for (const url of originalUrls) {
        const urlObj = new URL(url);
        if (stagingUrlMap.has(urlObj.pathname)) {
            matchingOriginalUrls.push(url);
            matchingStagingUrls.push(stagingUrlMap.get(urlObj.pathname));
        }
    }

    await writeJsonFile(matchingOriginalUrls, 'matching_original_urls.json');
    await writeJsonFile(matchingStagingUrls, 'matching_staging_urls.json');

    return { matchingOriginalUrls, matchingStagingUrls };
}

async function sortUrls() {
    try {
        // Read values from JSON files
        const mainUrls = await readJsonFile('matching_main_urls.json');
        const stgUrls = await readJsonFile('matching_stg_urls.json');
        const originalUrls = await readJsonFile('matching_original_urls.json');
        const stagingUrls = await readJsonFile('matching_staging_urls.json');

        if (!Array.isArray(mainUrls) || !Array.isArray(stgUrls) || !Array.isArray(originalUrls) || !Array.isArray(stagingUrls)) {
            throw new Error('JSON files should contain arrays');
        }

        // Sort original URLs based on the order of main URLs
        const sortedOriginalUrls = mainUrls.filter(url => originalUrls.includes(url));

        // Write sorted original URLs back to file
        await writeJsonFile(sortedOriginalUrls, 'matching_original_urls.json');

        // Sort staging URLs based on the order of main URLs
        const sortedStagingUrls = stgUrls.filter(url => stagingUrls.includes(url));
        
        // Write sorted staging URLs back to file
        await writeJsonFile(sortedStagingUrls, 'matching_staging_urls.json');

        console.log('URLs sorted successfully.');
    } catch (error) {
        console.error('Error:', error);
    }
}

const originalFile = 'matching_main_urls.json';
const stagingFile = 'matching_stg_urls.json';
checkRedirects(originalFile, stagingFile);
