module.exports = async (page, scenario, viewport) => {
  
  const userAgent = await page.evaluate(() => navigator.userAgent);
  console.log('Current User Agent:', userAgent);

  if (viewport.width > 1024) {
    // Desktop interaction with hover
    for (const hoverSelector of scenario.hoverSelectors) {
      await page.waitForSelector(hoverSelector);
      await page.hover(hoverSelector);
      await page.waitForTimeout(scenario.postInteractionWait || 3000);
    }
  } else {
    // Tablet/mobile interaction with click
    for (const clickSelector of scenario.clickSelectors) {
    await page.waitForSelector(clickSelector);
    await page.click(clickSelector);
    await page.waitForTimeout(scenario.postInteractionWait || 3000);
  }
};
}

