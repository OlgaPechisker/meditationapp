const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Opening http://localhost:4200...');
    await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
    console.log('Page loaded successfully');
    
    const screenshotPath = 'c:\\Users\\opechisker\\source\\repos\\Einat\\.copilot\\session-state\\c89392d9-ff5c-45e4-b0fe-70a029b733f9\\files\\homepage-after-changes.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // Get page title and basic info
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Check header/logo/menu elements
    const header = await page.$('header, nav, [role="banner"]');
    const logo = await page.$('img[alt*="logo"], img[src*="logo"], .logo');
    const menu = await page.$('menu, nav ul, [role="navigation"]');
    
    console.log(`Header found: ${!!header}`);
    console.log(`Logo found: ${!!logo}`);
    console.log(`Menu found: ${!!menu}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
