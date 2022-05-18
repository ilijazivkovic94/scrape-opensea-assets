const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
  path: 'result.csv',
  header: [
    {id: 'collection_name', title: 'Collection Name'},
    {id: 'item_name', title: 'Item Name'},
    {id: 'image', title: 'Image'},
    {id: 'price', title: 'Price'},
    {id: 'collection_url', title: 'Collection URL'},
    {id: 'totalCount', title: 'Total Items Count'},
  ]
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const scraperObject = {
	url: 'https://opensea.io/assets',
	fullItems: [],
	totalHeight: 0,
	distance: 100,
	height: 0,
	totalCount: 0,
	async scraper(browser){
		this.totalCount = 0;
		let page = await browser.newPage();
		console.log(`Navigating to ${this.url}...`);
		await page.setDefaultNavigationTimeout(0);
		await page.goto(this.url);
	    await page.setViewport({
	        width: 1920,
	        height: 937
	    });
		// Wait for the required DOM to be rendered
		await page.waitForSelector('div[role="gridcell"]');
		
		let pagePromise = (link) => {
			return new Promise(async(resolve, reject) => {
				let dataObj = {};
				let newPage = await browser.newPage();
				await newPage.setDefaultNavigationTimeout(0);
				await newPage.goto(link);
				dataObj['item_counts'] = await newPage.$eval('.CollectionStatsBar--info', elem => elem.querySelector('span').innerText);
				resolve(dataObj);
				await newPage.close();
			});
		};

		let getItems = async () => {
			let asserts = await page.$$eval('div[role="gridcell"]', (items) => {
				items = items.map((el) => {
					if (el.querySelector('.AssetCardFooter--collection-name') && el.querySelector('.AssetCardFooter--name') && el.querySelector('.AssetCardFooter--price-amount .Price--amount')) {
						let collection_url = el.querySelector('.AssetCardFooter--collection-name').href;
						return {
							image: el.querySelector('.Image--image').src,
							collection_name: el.querySelector('.AssetCardFooter--collection-name').innerText,
							item_name: el.querySelector('.AssetCardFooter--name').innerText,
							price: el.querySelector('.AssetCardFooter--price-amount .Price--amount').innerText,
							collection_url,
						}
					} else {
						return null;
					}
				});
				return items.filter((el) => {
					return el !== null && typeof el !== 'undefined';
				});
			});
			const allItems = this.fullItems;
			let filtered = asserts;
			if(this.fullItems.length > 0) {
				filtered = asserts.filter(e => allItems.findIndex(item => item.collection_name === e.collection_name) < 0);
			}
			for (let i = 0; i < filtered.length; i++) {
				if (filtered[i] && filtered[i].collection_url) {
					const info = await pagePromise(filtered[i].collection_url);
					if (info && info['item_counts']) {
						filtered[i].totalCount = info['item_counts'];
					} else {
						filtered[i].totalCount = 0;
					}
					console.log('Scrapped ' + (this.fullItems.length + i + 1) + ' assets now');
				} else {
					filtered[i].totalCount = 0;
				}
			}
			this.fullItems = [...this.fullItems, ...filtered];
		}

		let autoScroll = async () => {
		    const height = await page.evaluate(async () => {
		        return await new Promise((resolve, reject) => {
					var scrollHeight = document.body.scrollHeight;
					let totalHeight = 0;
					let distance = 100;
					window.scrollBy(0, distance);
					totalHeight += distance;
					resolve({
						height: scrollHeight - window.innerHeight,
					});
		        });
		    });
			this.totalHeight += this.distance;
			this.height = height.height;
		};
		let scrapeData = async () => {
			await sleep(300);
			await getItems();
			await autoScroll();
			
			if(this.totalHeight % 2000 == 0) {
				const writeItems = this.fullItems.filter(item => item.collection_name !== '');
				this.totalCount += writeItems.length;
				await csvWriter
					.writeRecords(writeItems);
				this.fullItems = [];
				console.log('Scrapped ' + this.totalCount + ' assets now and the CSV file was written successfully');
			}
			if(this.totalHeight <= this.height){
				scrapeData();
			}
		};

		scrapeData();
	},
}

module.exports = scraperObject;