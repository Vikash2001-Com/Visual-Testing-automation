const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Enhances URL base extraction to include protocol, host, and first significant path segment
function getBaseUrl(url) {
    const urlObj = new URL(url);
    let pathSegments = urlObj.pathname.split('/').filter(segment => segment);
    let basePath = pathSegments.length > 0 ? `/${pathSegments[0]}` : '';
    return `${urlObj.protocol}//${urlObj.host}${basePath}`;
}

// Sorts URLs based on their path components for consistent ordering
/*function sortUrls(urls) {
    return urls.sort((a, b) => {
        const pathA = new URL(a).pathname;
        const pathB = new URL(b).pathname;
        return pathA.localeCompare(pathB);
    });
}*/
function sortUrls(urls) {
    return urls;
}


// Refines link collection and exclusion logic, and updates for new headless mode
async function getAllLinks(url, outputFilename) {
    const baseUrl = getBaseUrl(url);
    const mainPath = new URL(url).pathname;

    const browser = await puppeteer.launch({headless: "new"}); // Updated for new headless mode
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 100000 });

    const links = await page.evaluate(({baseUrl,mainPath}) => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors.map(anchor => anchor.href)
            .filter(href => {
                const urlObj = new URL(href);
                return href.startsWith(baseUrl) && urlObj.pathname.startsWith(mainPath);
            })
            .filter(href => !href.includes('#') && !href.includes('javascript:void') && !href.match(/\.(jpg|jpeg|png|pdf)$/));
    }, { baseUrl, mainPath });

    await browser.close();

    const sortedLinks = sortUrls(links);

    fs.writeFileSync(outputFilename, JSON.stringify(sortedLinks, null, 2));
    console.log(`\n Links saved to ${outputFilename}`);
    console.log(`Number of links saved: ${sortedLinks.length}`);
}

// Streamlines user input and processing flow for clarity and error handling
async function main() {
    try {
        const mainUrl = await new Promise(resolve => rl.question('Enter the main URL: ', resolve));
        const stagingUrl = await new Promise(resolve => rl.question('Enter the staging URL: ', resolve));
        
        await getAllLinks(mainUrl, 'links.json');
        await getAllLinks(stagingUrl, 'links_sta.json');
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        rl.close();
    }
}

main();
