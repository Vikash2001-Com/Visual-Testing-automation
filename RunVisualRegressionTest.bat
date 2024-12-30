@echo off
echo Installing npm dependencies
call npm install
echo.
echo Running geturls_sort.js
call node geturls_sort.js
echo.
echo Running match_urls.js
call node match_urls.js
echo.
echo Running gen_screenshot_cross.js
call node gen_screenshot_cross.js
echo.
echo Running gen_backstop.js
call node gen_backstop.js
echo.
echo Generating BackstopJS references
call backstop reference
echo.
echo Running BackstopJS tests
call backstop test
echo.
echo Visual Regression Test completed successfully.
pause
