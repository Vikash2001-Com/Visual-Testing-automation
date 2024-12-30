const imageSize = require('image-size');
const fs = require('fs').promises;
const path = require('path');

async function getImageDimensions(imagePath) {
  try {
    const dimensions = imageSize(imagePath);
    return dimensions;
  } catch (error) {
    console.error(`Error getting dimensions for image: ${imagePath}`, error);
    return null;
  }
}

// Function to extract leading number from filename
function extractLeadingNumber(filename) {
  const match = filename.match(/\d+/); 
  return match ? parseInt(match[0], 10) : 0;
}

// Custom sort function to sort filenames by their leading numbers
function sortByLeadingNumber(a, b) {
  const numberA = extractLeadingNumber(a);
  const numberB = extractLeadingNumber(b);
  return numberA - numberB;
}

async function generateBackstopConfig(screenshotsDirOriginal, screenshotsDirStaging, backstopConfigPath) {
  try {
    let originalScreenshots = await fs.readdir(screenshotsDirOriginal);
    let stagingScreenshots = await fs.readdir(screenshotsDirStaging);

    // Filter out the "_warmup_screenshot.png" from both arrays
    originalScreenshots = originalScreenshots.filter(filename => filename !== "_warmup_screenshot.png");
    stagingScreenshots = stagingScreenshots.filter(filename => filename !== "_warmup_screenshot.png");

    // Sort the filenames alphabetically
    originalScreenshots.sort(sortByLeadingNumber);
    stagingScreenshots.sort(sortByLeadingNumber);
 
    const scenarios = [];

    for (const filename of originalScreenshots) {
      const originalScreenshotPath = path.join(screenshotsDirOriginal, filename);
      const stagingFilename = filename.replace('original', 'staging');
      const stagingScreenshotPath = path.join(screenshotsDirStaging, stagingFilename);
      // To ensure the staging file exists before proceeding
      if (!stagingScreenshots.includes(stagingFilename)) {
        console.warn(`Warning: Matching staging file not found for ${filename}, skipping.`);
        continue; // Skip this iteration if the corresponding staging file does not exist
      }
      
      const dimensions = await getImageDimensions(originalScreenshotPath);

      if (dimensions) {
        scenarios.push({
          label: filename,
          url: `file://${path.resolve(stagingScreenshotPath)}`,
          referenceUrl: `file://${path.resolve(originalScreenshotPath)}`,


          
          hideSelectors: [],
          removeSelectors: [],
          selectors: ["document"],
          readyEvent: null,
          delay: 10000,
          misMatchThreshold: 0.0000001,
          requireSameDimensions: false,
          viewports: [
            {
              label: 'screenshot',
              width: dimensions.width,
              height: dimensions.height
            }
          ],
        });
      }
    }

    const backstopConfig = {
      id: "my_test_project",
      viewports: [],
      scenarios: scenarios,
      paths: {
        bitmaps_reference: "backstop_data/bitmaps_reference",
        bitmaps_test: "backstop_data/bitmaps_test",
        engine_scripts: "backstop_data/engine_scripts",
        html_report: "backstop_data/html_report",
        ci_report: "backstop_data/ci_report"
      },
      report: ["browser"],
      engine: "puppeteer",
      engineOptions: {
        args: ["--no-sandbox"]
      },
      asyncCaptureLimit: 5,
      asyncCompareLimit: 30,
      debug: false,
      debugWindow: false
    };

    await fs.writeFile(backstopConfigPath, JSON.stringify(backstopConfig, null, 2));
    console.log('BackstopJS configuration has been generated.');
  } catch (error) {
    console.error('An error occurred while creating the BackstopJS configuration:', error);
  }
}

const screenshotsDirOriginal = "original_scr"; // Replace with your path
const screenshotsDirStaging = "staging_scr"; // Replace with your path
const backstopConfigPath = 'backstop.json'; // Path where backstop config will be saved

generateBackstopConfig(screenshotsDirOriginal, screenshotsDirStaging, backstopConfigPath);