# Visual Regression Testing Suite

This project provides a comprehensive visual regression testing solution using BackstopJS, Puppeteer, and Selenium WebDriver. It's designed to capture and compare screenshots of web pages across different environments (original vs staging) to detect visual regressions.

## Features

- Automated screenshot capture of web pages
- Visual comparison between original and staging environments
- Support for multiple platforms (Windows, Linux, macOS)
- Configurable test scenarios and viewports
- Detailed test reports with visual diffs

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- BackstopJS (installed globally via npm)
- Chrome/Chromium browser

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install -g backstopjs
   npm install
   ```

## Project Structure

- `original_scr/`: Directory for storing original environment screenshots
- `staging_scr/`: Directory for storing staging environment screenshots
- `backstop_data/`: Contains test reports and reference screenshots
- `backstop.json`: Main configuration file for BackstopJS
- `gen_backstop.js`: Generates BackstopJS configuration
- `gen_screenshot_cross.js`: Cross-browser screenshot generation
- `geturls_sort.js`: Processes and sorts URLs for testing
- `match_urls.js`: Matches URLs between original and staging environments
- `RunVisualRegressionTest.*`: Platform-specific test runners

## Usage

### Running Tests

#### Windows:
```powershell
.\RunVisualRegressionTest.ps1
```

#### Linux/macOS:
```bash
chmod +x RunVisualRegressionTest.sh
./RunVisualRegressionTest.sh
```

### Test Workflow

1. The test runner will:
   - Install required dependencies
   - Process and sort URLs for testing
   - Match URLs between original and staging environments
   - Generate screenshots for both environments
   - Create a BackstopJS configuration
   - Run visual regression tests
   - Generate test reports

## Configuration

### Environment Variables

Set the following environment variables as needed:
- `ORIGINAL_BASE_URL`: Base URL for the original environment
- `STAGING_BASE_URL`: Base URL for the staging environment

### Customizing Tests

1. Modify `backstop.json` to adjust viewports, scenarios, and test settings
2. Update URL lists in the respective JSON files for custom test cases
3. Adjust screenshot settings in `gen_screenshot_cross.js`

## Viewing Results

After tests complete, view the interactive HTML report in the `backstop_data/html_report` directory or check the console output for test results.

## Troubleshooting

- Ensure Chrome/Chromium is installed and accessible
- Verify network connectivity to the target environments
- Check file permissions for screenshot directories
- Review logs in the console for specific error messages

## Dependencies

- BackstopJS: Visual regression testing framework
- Puppeteer: Headless Chrome Node.js API
- Selenium WebDriver: Browser automation
- Node-fetch: HTTP request client
- Image-size: Image dimension detection

## License

This project is proprietary and confidential.
