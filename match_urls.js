const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Function to read JSON file
async function readJsonFile(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
}

// Function to write JSON file
async function writeJsonFile(data, filePath) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Function to find duplicates in links
function findDuplicates(links) {
    // Find the number of duplicate links
    const uniqueLinks = Array.from(new Set(links));
    const totalLinks = links.length;
    const duplicateCount = totalLinks - uniqueLinks.length;
    return [duplicateCount, uniqueLinks];
}

// Function to extract domain from URL
function extractDomain(url) {
    return (new URL(url)).origin;
}

// Function to compare links and perform scraping
async function compare(originalFile, stagingFile) {
    // Read the lists of links from JSON files
    const originalLinks = await readJsonFile(originalFile);
    const stagingLinks = await readJsonFile(stagingFile);

    // Find duplicates
    const [originalDuplicates, originalUnique] = findDuplicates(originalLinks);
    const [stagingDuplicates, stagingUnique] = findDuplicates(stagingLinks);
 
    console.log(`Original:`);
 
    console.log(`Total Links in Original File: ${originalLinks.length}`);
    console.log(`Unique Links in Original File: ${originalUnique.length}`);
    console.log(`Duplicate Links in Original File: ${originalDuplicates}`);

    console.log(`Staging:`);
    
    console.log(`Total Links in Staging File: ${stagingLinks.length}`);
    console.log(`Unique Links in Staging File: ${stagingUnique.length}`);
    console.log(`Duplicate Links in Staging File: ${stagingDuplicates}`);

    // Remove duplicates and map to paths
    const originalPaths = new Set(originalLinks.map(url => (new URL(url)).pathname));
    const stagingPaths = new Set(stagingLinks.map(url => (new URL(url)).pathname));

    // Find matching and unique paths
    const matchingPaths = [...originalPaths].filter(path => stagingPaths.has(path));
    // const extraPathsInStaging = [...stagingPaths].filter(path => !originalPaths.has(path));
    // const missingPathsInStaging = [...originalPaths].filter(path => !stagingPaths.has(path));

    // Reconstruct full URLs for the output
    const matchingOriginalUrls = [];
    const matchingStagingUrls = [];
    for (const path of matchingPaths) {
        const originalUrl = originalLinks.find(url => (new URL(url)).pathname === path);
        const stagingUrl = stagingLinks.find(url => (new URL(url)).pathname === path);
        if (originalUrl && stagingUrl) {
            const originalDomain = extractDomain(originalUrl);
            const stagingDomain = extractDomain(stagingUrl);
            matchingOriginalUrls.push(originalDomain + path);
            matchingStagingUrls.push(stagingDomain + path);
        }
    }
    
    console.log('\nOverall Counts:');
    console.log(`Total Matching Links Count: ${matchingOriginalUrls.length}`);
    
    await writeJsonFile(matchingOriginalUrls, 'matching_original_urls.json');
    await writeJsonFile(matchingStagingUrls, 'matching_staging_urls.json');
}

// Replace with the actual file paths of your JSON files
const originalFile = 'links.json';
const stagingFile = 'links_sta.json';

compare(originalFile, stagingFile);
