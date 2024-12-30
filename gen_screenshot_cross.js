const { Builder, By, until, logging } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const edge = require('selenium-webdriver/edge'); 
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const deviceWidths = [
  { name: 'desktop', width: 1920 },
  { name: 'tablet', width: 1024 },
  { name: 'mobile', width: 375 }
];

async function promptForDevices() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question('For which device you want to run the test? (1: Desktop, 2: Tablet, 3: Mobile): ', (choice) => {
      rl.close();
      resolve(choice.trim());
    });
  });
}

// Code block to check if folders are empty/absent to denote testing for first time ---------------------
async function directoryExistsAndIsEmpty(directoryPath) {
  try {
    const files = await fs.readdir(directoryPath);
    return files.length === 0;
  } catch (error) {
    return true; 
  }
}

async function question(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (input) => {
      rl.close();
      resolve(input);
    });
  });
}

async function manageExclusion(originalUrls, stagingUrls, caseNumbers) {
  const excludedOriginalUrls = [];
  const excludedStagingUrls = [];
  
  caseNumbers.forEach((caseNumber) => {
    excludedOriginalUrls.push(originalUrls[caseNumber - 1]); 
    excludedStagingUrls.push(stagingUrls[caseNumber - 1]);
  });

  const remainingOriginalUrls = originalUrls.filter((_, index) => !caseNumbers.includes(index + 1));
  const remainingStagingUrls = stagingUrls.filter((_, index) => !caseNumbers.includes(index + 1));

  await fs.writeFile('matching_original_urls.json', JSON.stringify(remainingOriginalUrls, null, 2), 'utf8');
  await fs.writeFile('matching_staging_urls.json', JSON.stringify(remainingStagingUrls, null, 2), 'utf8');

  await fs.writeFile('excluded_original_urls.json', JSON.stringify(excludedOriginalUrls, null, 2), 'utf8');
  await fs.writeFile('excluded_staging_urls.json', JSON.stringify(excludedStagingUrls, null, 2), 'utf8');
}

async function revertExcludedCases() {
  const [originalUrls, stagingUrls, excludedOriginalUrls, excludedStagingUrls] = await Promise.all([
    fs.readFile('matching_original_urls.json', 'utf8').then(JSON.parse),
    fs.readFile('matching_staging_urls.json', 'utf8').then(JSON.parse),
    fs.readFile('excluded_original_urls.json', 'utf8').then(JSON.parse),
    fs.readFile('excluded_staging_urls.json', 'utf8').then(JSON.parse),
  ]);

  const mergedOriginalUrls = [...originalUrls, ...excludedOriginalUrls].sort();
  const mergedStagingUrls = [...stagingUrls, ...excludedStagingUrls].sort();

  await fs.writeFile('matching_original_urls.json', JSON.stringify(mergedOriginalUrls, null, 2), 'utf8');
  await fs.writeFile('matching_staging_urls.json', JSON.stringify(mergedStagingUrls, null, 2), 'utf8');

  await fs.unlink('excluded_original_urls.json');
  await fs.unlink('excluded_staging_urls.json');
}


// Code block for browser set up ------------------------------------------------------------------------
async function promptForBrowser() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question('Select a browser (1: Chrome, 2: Firefox, 3: Edge, 4: Safari):', (choice) => {
      rl.close();
      resolve(choice.trim());
    });
  });
}

async function createDriver(browserChoice) {
  let driver;

  switch(browserChoice) {
    case '1': // Chrome
      let chromeOptions = new chrome.Options();
      chromeOptions.addArguments("--headless");
      chromeOptions.addArguments('disable-infobars'); 
      chromeOptions.addArguments("--disable-gpu"); 
      chromeOptions.addArguments('--log-level=3');
      chromeOptions.addArguments('--silent');
      chromeOptions.addArguments('--no-sandbox');
      driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();
      break;
    case '2': // Firefox
      let firefoxOptions = new firefox.Options();
      //firefoxOptions.addArguments("-headless");
      firefoxOptions.addArguments("--headless");
      firefoxOptions.addArguments('--disable-infobars');
      firefoxOptions.addArguments('--log-level=3');
      firefoxOptions.addArguments('--silent');
      firefoxOptions.addArguments('--no-sandbox');
    
      driver = await new Builder().forBrowser('firefox').setFirefoxOptions(firefoxOptions).build();
      break;
    case '3': // Edge
      let edgeOptions = new edge.Options();
      edgeOptions.addArguments("--headless");
      edgeOptions.addArguments("--disable-gpu");
      edgeOptions.addArguments('disable-infobars'); 
      edgeOptions.addArguments('--log-level=3');
      edgeOptions.addArguments('--silent');
      edgeOptions.addArguments('--no-sandbox');
      driver = await new Builder().forBrowser('MicrosoftEdge').setEdgeOptions(edgeOptions).build();
      break;
    case '4': // Safari
      driver = await new Builder().forBrowser('safari').build(); 
      break;
    default:
      console.log("Invalid browser choice. Defaulting to Chrome.");
      driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();
  }
  return driver;
}


// Code block for calculating hieght --------------------------------------------------------------------

/*async function getPageHeight(driver, url) {
  await driver.get(url);
  await driver.wait(until.elementLocated(By.css('body')), 30000);
  const fullHeight = await driver.executeScript(
    'return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight, document.body.clientHeight, document.documentElement.clientHeight,window.scrollTo(0, 0),await new Promise(resolve => setTimeout(resolve, 5000)),return Array.from(document.querySelectorAll("*")).filter(el => el.offsetHeight > 0 && el.offsetWidth > 0).reduce((max, el) => Math.max(max, el.getBoundingClientRect().bottom), 0))'
  );
  return fullHeight;
}*/

async function getPageHeight(driver, url) {
  try {
    await driver.get(url);
    await driver.wait(until.elementLocated(By.css('body')), 30000);
  } catch (error) {
    console.log(`Error waiting for body element on ${url}:`, error);
    // Return a default height if body is not found within the timeout
    return 1024;
  }

  // If the body is found, continue with scrolling and height calculation
  await driver.executeScript('window.scrollTo(0, 0);');
  await new Promise(resolve => setTimeout(resolve, 5000)); 

  // Calculate the full height of the page after waiting
  const fullHeight = await driver.executeScript(
    'return Math.max(' +
    'document.body.scrollHeight, ' +
    'document.documentElement.scrollHeight, ' +
    'document.body.offsetHeight, ' +
    'document.documentElement.offsetHeight, ' +
    'document.body.clientHeight, ' +
    'document.documentElement.clientHeight, ' +
    'Array.from(document.querySelectorAll("*"))' +
    '.filter(el => el.offsetHeight > 0 && el.offsetWidth > 0)' +
    '.reduce((max, el) => Math.max(max, el.getBoundingClientRect().bottom), 0)' +
    ');'
  );
  return fullHeight;
}


async function readUrlsFromJson(filePath) {
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

function promptForInteractiveElements() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question('Do you want to capture screenshots along with interactive elements? (y/n): ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

async function interactWithPage(driver, hoverSelectors, interactionSelectors, removeSelectors, includeInteractions) {
  if (includeInteractions) {
    // Hover actions
    for (const selector of hoverSelectors) {
        try {
            const element = await driver.wait(until.elementLocated(By.css(selector)), 5000);
            await driver.actions().move({origin: element}).perform();
        } catch (error) {
           console.log(`Hover action skipped`);
        }
    }
    // Click actions
    for (const selector of interactionSelectors) {
        try {
            const element = await driver.findElement(By.css(selector));
            await element.click();
            await driver.sleep(1000); 
        } catch (error) {
           console.log(`Click action skipped`);
        }
    }
  }
  
  for (const selector of removeSelectors) {
    try {
        const removeSuccess = await driver.executeAsyncScript((selector, done) => {
            let attempts = 0; 
            const interval = setInterval(() => {
                attempts++; 
                const elements = document.querySelectorAll(selector);
                if (elements.length) {
                    elements.forEach(element => element.parentNode.removeChild(element));
                    clearInterval(interval);
                    done(true);
                } else if (attempts >= 2) {
                    clearInterval(interval);
                    done(false);
                }
            }, 1000);
            setTimeout(() => {
                clearInterval(interval);
                done(false);
            }, 3000); 
        }, selector);

        if (!removeSuccess) {
            console.log(`Removal action failed for selector after retries.`);
        }
    } catch (error) {
        console.log(`Removal action skipped for selector.`);
    }
}
}


async function captureScreenshot(driver, url, height, screenshotsDir, index, label, deviceName, hoverSelectors, interactionSelectors, removeSelectors, width, includeInteractions, isWarmUp = false, retries = 3) {
  console.log(`[' ${label}-${deviceName}'] Start Capturing screenshot '${index}' for '${url}'`);
  
  for (let i = 0; i < retries; i++) {
    try {
      await driver.get(url);

      // Wait for the page DOM to load
      await driver.wait(async () => {
        const readyState = await driver.executeScript('return document.readyState');
        return readyState === 'complete';
      }, 20000);

      // await driver.manage().window().setRect({ width: width, height: 1080 });
      await interactWithPage(driver, hoverSelectors, interactionSelectors, removeSelectors, includeInteractions);
      await driver.manage().window().setRect({width: width, height});
      await driver.sleep(2000); 

      const image = await driver.takeScreenshot();

      const urlParts = url.split('/').filter(part => part !== '').slice(-2); 
      let baseFilename = urlParts.join('_');

      // Limit the filename length by truncating the last part if necessary
      const maxFilenameLength = 30; 
      if (baseFilename.length > maxFilenameLength) {
        baseFilename = baseFilename.substring(0, maxFilenameLength);
      }


      const screenshotFilename = isWarmUp ? `_warmup_screenshot.png` : `${label}_${index}_${deviceName}_${baseFilename}.png`;
      const screenshotPath = path.join(screenshotsDir, screenshotFilename);
      await fs.writeFile(screenshotPath, image, 'base64');
    
      console.log(`['${label}-${deviceName}}'] Finished capturing screenshot '${index}' for '${url}'\n`);
      return; // Exit the function if successful
    } catch (error) {
      console.error(`Error capturing screenshot '${index}' for '${url}':`, error);
      console.log(`Retrying (${i + 1}/${retries})...`);
      await driver.sleep(5000); // Wait for 5 seconds before retrying
    }
  }

  console.error(`Failed to capture screenshot '${index}' for '${url}' after ${retries} retries.`);
}


async function processUrlPair(driver1, driver2, originalUrl, stagingUrl, index, originalScreenshotsDir, stagingScreenshotsDir, hoverSelectors, interactionSelectors, removeSelectors, includeInteractions, selectedDevices) {

  for (const device of deviceWidths) {
    if (selectedDevices.includes(device.name)) {
    await driver1.manage().window().setRect({ width: device.width, height: 1080 }); 
    await driver2.manage().window().setRect({ width: device.width, height: 1080 }); 

    const originalHeight = await getPageHeight(driver1, originalUrl);
    const stagingHeight = await getPageHeight(driver2, stagingUrl);
    const maxHeight = Math.max(originalHeight, stagingHeight);

    await driver1.manage().window().setRect({ width: device.width, height: maxHeight });
    await driver2.manage().window().setRect({ width: device.width, height: maxHeight });

    await Promise.all([
      captureScreenshot(driver1, originalUrl, maxHeight, originalScreenshotsDir, index, 'original', device.name, hoverSelectors, interactionSelectors, removeSelectors, device.width, includeInteractions),
      captureScreenshot(driver2, stagingUrl, maxHeight, stagingScreenshotsDir, index, 'staging', device.name, hoverSelectors, interactionSelectors, removeSelectors, device.width, includeInteractions)
    ]);
    }
  }
}


// function to check for directory existence
async function checkAndCreateDirectory(directoryPath) {
  try {
    await fs.access(directoryPath);
    console.log(`Directory ${directoryPath} already exists.`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`Directory ${directoryPath} does not exist. Creating...`);
      await fs.mkdir(directoryPath, { recursive: true });
      console.log(`Directory ${directoryPath} created.`);
    } else {
      throw error;
    }
  }
}

async function clearDirectory(directoryPath) {
  try {
    const files = await fs.readdir(directoryPath);
    const unlinkPromises = files.map(filename => fs.unlink(path.join(directoryPath, filename)));
    return Promise.all(unlinkPromises);
  } catch (error) {
    console.error(`Error while clearing directory ${directoryPath}:`, error);
    throw error;
  }
}

async function removeDuplicatesFromMatchingLinks() {
  let originalUrls = await readUrlsFromJson('matching_original_urls.json');
  let stagingUrls = await readUrlsFromJson('matching_staging_urls.json');

  originalUrls = [...new Set(originalUrls)];
  stagingUrls = [...new Set(stagingUrls)];

  await fs.writeFile('matching_original_urls.json', JSON.stringify(originalUrls, null, 2), 'utf8');
  await fs.writeFile('matching_staging_urls.json', JSON.stringify(stagingUrls, null, 2), 'utf8');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseCaseNumbers(input) {
  let caseNumbers = [];
  let segments = input.split(',').map(segment => segment.trim());
  segments.forEach(segment => {
    if (segment.includes('-')) {
      let [start, end] = segment.split('-').map(Number);
      for (let i = start; i <= end; i++) {
        if (!caseNumbers.includes(i)) {
          caseNumbers.push(i);
        }
      }
    } else {
      let number = parseInt(segment, 10);
      if (!isNaN(number) && !caseNumbers.includes(number)) {
        caseNumbers.push(number);
      }
    }
  });
  return caseNumbers;
}

async function retryTestCases(browserChoice, hoverSelectors, interactionSelectors, removeSelectors, includeInteractions, originalScreenshotsDir, stagingScreenshotsDir, selectedDevices) {
  let retryAnswer = await question("Do you want to retry testing any cases? (y/n): ");
  if (retryAnswer.trim().toLowerCase() === 'y') {
    let retryCasesInput = await question("Enter the case numbers to retry (e.g., 1,2,3 or 1-4,6): ");

    let retryCaseNumbers = parseCaseNumbers(retryCasesInput);
    const originalUrls = await readUrlsFromJson('matching_original_urls.json');
    const stagingUrls = await readUrlsFromJson('matching_staging_urls.json');

    for (let caseNumber of retryCaseNumbers) {
      const originalUrl = originalUrls[caseNumber - 1];
      const stagingUrl = stagingUrls[caseNumber - 1];

      if (originalUrl && stagingUrl) {
        const driver1 = await createDriver(browserChoice);
        const driver2 = await createDriver(browserChoice);

        await processUrlPair(driver1, driver2, originalUrl, stagingUrl, caseNumber, originalScreenshotsDir, stagingScreenshotsDir, hoverSelectors, interactionSelectors, removeSelectors, includeInteractions, selectedDevices);

        await driver1.quit();
        await driver2.quit();
      } else {
        console.log(`Invalid case number: ${caseNumber}. Skipping.`);
      }
    }
  }
}

function chunkArray(array, size) {
  const chunkedArr = [];
  for (let i = 0; i < array.length; i += size) {
      chunkedArr.push(array.slice(i, i + size));
  }
  return chunkedArr;
}

async function processChunk(chunk, browserChoice, globalIndex, hoverSelectors, interactionSelectors, removeSelectors, includeInteractions, originalScreenshotsDir, stagingScreenshotsDir,selectedDevices) {
  const promises = chunk.map(async (urlPair, index) => {
      const driver1 = await createDriver(browserChoice);
      const driver2 = await createDriver(browserChoice);

      await processUrlPair(driver1, driver2, urlPair.original, urlPair.staging, globalIndex + index, originalScreenshotsDir, stagingScreenshotsDir, hoverSelectors, interactionSelectors, removeSelectors, includeInteractions, selectedDevices);

      await driver1.quit();
      await driver2.quit();
  });

  await Promise.all(promises);
}

async function main() {

  const original_Urls = await readUrlsFromJson('matching_original_urls.json');
  const staging_Urls = await readUrlsFromJson('matching_staging_urls.json');

  const isEmpty = await directoryExistsAndIsEmpty('original_scr') && await directoryExistsAndIsEmpty('staging_scr');
  if (!isEmpty) {
    let answer = await question("Do you want to exclude any cases for the test? (y/n): ");
    if (answer.trim().toLowerCase() === 'y') {
      let input = await question("Enter the case numbers to exclude (e.g., 1,2,3 or 1-4,6): ");
      
      let caseNumbers = parseCaseNumbers(input);
      
      await manageExclusion(original_Urls, staging_Urls, caseNumbers);
      const updatedOriginalUrls = await readUrlsFromJson('matching_original_urls.json');
      const updatedStagingUrls = await readUrlsFromJson('matching_staging_urls.json');

      if (updatedOriginalUrls.length === 0 || updatedStagingUrls.length === 0) {
        console.log("All cases have been excluded. No URLs left for processing.");
        return; // Terminate the script gracefully
      }
    }
  }

  const browserChoice = await promptForBrowser();
  const includeInteractions = await promptForInteractiveElements();
  const deviceChoice = await promptForDevices();
  
  // Define selectedDevices based on user's choice
  let selectedDevices = [];
  if (deviceChoice.includes('1')) selectedDevices.push('desktop');
  if (deviceChoice.includes('2')) selectedDevices.push('tablet');
  if (deviceChoice.includes('3')) selectedDevices.push('mobile');

  // Define your selectors here
  const hoverSelectors = ['.cmp-experiencefragment--subsidiary-header-xf .cmp-navigation__item--level-0.cmp-navigation__item--active>.cmp-navigation__item-link'];
  const interactionSelectors = ['.cmp-experiencefragment--subsidiary-header-xf .hamburger-search-container'];
  const removeSelectors = ['#onetrust-banner-sdk','.ot-sdk-container','.ot-sdk-row'];

  const originalUrls = await readUrlsFromJson('matching_original_urls.json');
  const stagingUrls = await readUrlsFromJson('matching_staging_urls.json');

  const urlPairs = originalUrls.map((originalUrl, index) => ({
      original: originalUrl,
      staging: stagingUrls[index]
  }));

  const segmentSize = 12; // Adjust this based on your needs
  const concurrentLimit = 4; // Number of URLs to process in parallel
  
  const urlChunks = chunkArray(urlPairs, segmentSize);

  let globalIndex = 1;

  const originalScreenshotsDir = 'original_scr';
  const stagingScreenshotsDir = 'staging_scr';
  await checkAndCreateDirectory(originalScreenshotsDir);
  await checkAndCreateDirectory(stagingScreenshotsDir);
  await clearDirectory(originalScreenshotsDir);
  await clearDirectory(stagingScreenshotsDir);

  for (let i = 0; i < urlChunks.length; i++) {
      const chunk = urlChunks[i];

      for (let j = 0; j < chunk.length; j += concurrentLimit) {
          const subChunk = chunk.slice(j, j + concurrentLimit);
          await processChunk(subChunk, browserChoice, globalIndex, hoverSelectors, interactionSelectors, removeSelectors, includeInteractions, originalScreenshotsDir, stagingScreenshotsDir, selectedDevices);
          globalIndex += subChunk.length;
      }
  }

  console.log('\nAll screenshots captured successfully.');
  try {
    await retryTestCases(browserChoice, hoverSelectors, interactionSelectors, removeSelectors, includeInteractions, originalScreenshotsDir, stagingScreenshotsDir, selectedDevices);
    console.log("Retry logic completed.");
  } catch (error) {
    console.error("Error during retry logic:", error);
  }

  const excludedOriginalExists = await fileExists('excluded_original_urls.json');
  const excludedStagingExists = await fileExists('excluded_staging_urls.json');

  if (excludedOriginalExists && excludedStagingExists) {
    let revertAnswer = await question("\n Do you want to revert excluded links back into the matching links JSON files? (y/n): ");
    if (revertAnswer.trim().toLowerCase() === 'y') {
      await revertExcludedCases();
      await removeDuplicatesFromMatchingLinks();
      console.log("Excluded links have been reverted back into the matching links JSON files.");
    }
  }
}

main();

/*
async function main() {
  const browserChoice = await promptForBrowser();
  const includeInteractions = await promptForInteractiveElements();

  // Define your selectors here
  const hoverSelectors = ['.cmp-experiencefragment--subsidiary-header-xf .cmp-navigation__item--level-0.cmp-navigation__item--active>.cmp-navigation__item-link'];
  const interactionSelectors = ['.cmp-experiencefragment--subsidiary-header-xf .hamburger-search-container'];
  const removeSelectors = ['#onetrust-banner-sdk','.ot-sdk-container','.ot-sdk-row'];

  const originalUrls = await readUrlsFromJson('matching_original_urls.json');
  const stagingUrls = await readUrlsFromJson('matching_staging_urls.json');

  const segmentSize = 10; // Adjust this based on your needs
  const originalUrlChunks = chunkArray(originalUrls, segmentSize);
  const stagingUrlChunks = chunkArray(stagingUrls, segmentSize);

  let globalIndex = 1; 

  const originalScreenshotsDir = 'original_scr';
  const stagingScreenshotsDir = 'staging_scr';
  await checkAndCreateDirectory(originalScreenshotsDir);
  await checkAndCreateDirectory(stagingScreenshotsDir);
  await clearDirectory(originalScreenshotsDir);
  await clearDirectory(stagingScreenshotsDir);

  for (let i = 0; i < originalUrlChunks.length; i++) {
      const driver1 = await createDriver(browserChoice);
      const driver2 = await createDriver(browserChoice);      

      // Warm-up part:
      if (i === 0 && originalUrlChunks[i].length > 0) {
        await Promise.all([
          captureScreenshot(driver1, originalUrlChunks[i][0], 1080, originalScreenshotsDir, 0, 'original', 'desktop', hoverSelectors, interactionSelectors, removeSelectors, 1920, includeInteractions, true),
          captureScreenshot(driver2, stagingUrlChunks[i][0], 1080, stagingScreenshotsDir, 0, 'staging', 'desktop', hoverSelectors, interactionSelectors, removeSelectors, 1920, includeInteractions, true)
        ]);
      }

      for (let j = 0; j < originalUrlChunks[i].length; j++) {
          await processUrlPair(driver1, driver2, originalUrlChunks[i][j], stagingUrlChunks[i][j], globalIndex, originalScreenshotsDir, stagingScreenshotsDir, hoverSelectors, interactionSelectors, removeSelectors, includeInteractions);
          globalIndex++; 
      }

      await driver1.quit();
      await driver2.quit();
  }

  console.log('\nAll screenshots captured successfully.');
}
*/
