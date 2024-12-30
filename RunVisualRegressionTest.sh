#!/bin/bash
echo "Installing npm dependencies"
npm install 

echo "Running geturls_sort.js"
node geturls_sort.js

echo "Running match_urls.js"
node match_urls.js

echo "Running gen_screenshot_cross.js"
node gen_screenshot_cross.js

echo "Running gen_backstop.js"
node gen_backstop.js

echo "Generating BackstopJS references"
backstop reference

echo "Running BackstopJS tests"
backstop test

echo "Visual Regression Test completed successfully."
