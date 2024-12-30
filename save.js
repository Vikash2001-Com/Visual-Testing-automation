const fs = require('fs-extra');
const path = require('path');

const backstopDataDir = path.join(__dirname, 'backstop_data');
const bitmapsTestDir = path.join(backstopDataDir, 'bitmaps_test');
const bitmapsReferenceDir = path.join(backstopDataDir, 'bitmaps_reference');
const archiveDir = path.join(backstopDataDir, 'bitmaps_reference_archive');

// Ensure the archive directory exists
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}

// Find the latest test directory
const latestTestDirName = fs.readdirSync(bitmapsTestDir)
  .map(name => ({ name, time: fs.statSync(path.join(bitmapsTestDir, name)).mtime.getTime() }))
  .sort((a, b) => b.time - a.time)[0].name;

// Create the corresponding reference directory in the archive location
const newReferenceDir = path.join(archiveDir, latestTestDirName);
fs.mkdirpSync(newReferenceDir);

// Copy the reference images to the archive
fs.copySync(bitmapsReferenceDir, newReferenceDir);

console.log(`Copied reference images to backup`);

// Copy the html_report directory to the latest bitmaps_test timestamped folder
const sourceHtmlReportDir = path.join(backstopDataDir, 'html_report');
const targetHtmlReportDir = path.join(bitmapsTestDir, latestTestDirName, 'html_report');
fs.copySync(sourceHtmlReportDir, targetHtmlReportDir);

//console.log(`Copied html_report to ${targetHtmlReportDir}`);

// Update the report.json in the latest bitmaps_test directory
const reportJsonPath = path.join(bitmapsTestDir, latestTestDirName, 'report.json');
if (fs.existsSync(reportJsonPath)) {
  const report = fs.readJsonSync(reportJsonPath);

  report.tests.forEach(test => {
    test.pair.reference = test.pair.reference.replace(
      '\\bitmaps_reference\\',
      `\\..\\..\\bitmaps_reference_archive\\${latestTestDirName}\\`
    );
    test.pair.test = test.pair.test.replace(
        '\\bitmaps_test\\',
        `\\..\\..\\bitmaps_test\\`
    );
    
    if (test.pair.diffImage) {
    test.pair.diffImage = test.pair.diffImage.replace(
      '\\bitmaps_test\\',
      `\\..\\..\\bitmaps_test\\`
    );
    }
  });

  fs.writeJsonSync(reportJsonPath, report, { spaces: 2 });
  //console.log(`Updated report.json paths in ${reportJsonPath}`);

  // Update the config.js in the copied html_report directory
  const configJsPath = path.join(targetHtmlReportDir, 'config.js');
  const configJsContent = `report(${JSON.stringify(report, null, 2)});`;
  fs.writeFileSync(configJsPath, configJsContent);
  //console.log(`Updated config.js in ${configJsPath}`);


  console.log(`Updated all data `);

}
