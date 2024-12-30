# PowerShell -ExecutionPolicy Bypass -File .\RunVisualRegressionTests.ps1
Write-Host "Installing npm dependencies"
npm install

Write-Host "Running geturls_sort.js"
node geturls_sort.js

Write-Host "Running match_urls.js"
node match_urls.js

Write-Host "Running gen_screenshot_cross.js"
node gen_screenshot_cross.js

Write-Host "Running gen_backstop.js"
node gen_backstop.js

Write-Host "Generating BackstopJS references"
backstop reference

Write-Host "Running BackstopJS tests"
backstop test

Write-Host "Visual Regression Test completed successfully."
