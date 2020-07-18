const pupHelper = require('./puppeteerhelper');
const path = require('path');
const fs = require('fs');
const {siteLink} = require('./keys');
let browser;
let categories = [];

const run = async () => {
  try {
    browser = await pupHelper.launchBrowser(true);
  
    await fetchCategories();

    for (let categoryNumber = 0; categoryNumber < categories.length; categoryNumber++) {
      await fetchFromCategory(categoryNumber);
    }
    
    await browser.close();
  } catch (error) {
    if (browser) await browser.close();
    return error;
  }
};

const fetchFromCategory = (categoryIdx) => new Promise(async (resolve, reject) => {
  let page;
  try {
    console.log(`${categoryIdx+1}/${categories.length} - Fetching from Category ${categories[categoryIdx].title}...`);
    page = await pupHelper.launchPage(browser);
    await page.goto(categories[categoryIdx].link, {timeout: 0, waitUntil: 'networkidle2'});
    await page.waitForSelector('.entry-content > blockquote > p');
    let quotes = await pupHelper.getTxtMultiple('.entry-content > blockquote > p', page);
    quotes = quotes.map(qt => qt.replace(/Click to tweet/gi, '').trim());

    categories[categoryIdx].quotes = quotes;

    const fileName = categories[categoryIdx].title.replace(/[\(\)]/gi, '').replace(/\s/gi, '_') + '.json';
    const filePath = path.resolve(__dirname, `results/${fileName.toLowerCase()}`);
    fs.writeFileSync(filePath, JSON.stringify(categories[categoryIdx]));

    await page.close();
    resolve(true);
  } catch (error) {
    if (page) await page.close();
    console.log('fetchFromCategory Error: ', error);
    reject(error);
  }
});

const fetchCategories = () => new Promise(async (resolve, reject) => {
  let page;
  try {
    page = await pupHelper.launchPage(browser);
    await page.goto(siteLink, {timeout: 0, waitUntil: 'load'});
    await page.waitForSelector('.entry-content > .homepagelinks');
    const categoriesLinksContainer = await page.$('.entry-content > .homepagelinks')
    const categoriesNodes = await categoriesLinksContainer.$$('a');
    for (let i = 0; i < categoriesNodes.length; i++) {
      const category = {
        title: await page.evaluate(elm => elm.innerText.trim(), categoriesNodes[i]),
        link: await page.evaluate(elm => elm.getAttribute('href').trim(), categoriesNodes[i]),
        quotes: [],
      }
      categories.push(category);
    }

    console.log(`Found ${categories.length} Categories...`);
    await page.close();
    resolve(true);
  } catch (error) {
    if (page) await page.close();
    console.log(`fetchCategories Error: ${error}`);
    reject(error);
  }
})

run();
