import puppeteer, { Page } from 'puppeteer-core';
import { getPassword } from './authentication';

type Index = {
	current: number;
	diffAmount: number;
	diffRate: number;
	dateTime: string;
};

type Market = {
	yenPerDollar: Index;
	bonds10: Index;
};

type Asset = {
	total: Total;
	possessList: Possess[];
};

type Total = {
	amount: number;
	diff: number;
	diffRate: number;
};

type Possess = {
	securityType: string;
	name: string;
	accountType: string;
	buyPrice: number;
	currentPrice: number;
	diff: number;
	diffRate: number;
	count: number;
	totalAmount: number;
	profit: number;
	profitRate: number;
};

type Favorite = {
	code: number;
	name: string;
	market: string;
	current: number;
	updatedAt: string;
	diff: number;
	diffRate: number;
	transaction: number;
};

type Result = {
	market: Market;
	asset: Asset;
	favoriteList: Favorite[];
};

const LOGIN_URL = 'https://www.rakuten-sec.co.jp/';
const ALL_ASSET_LIST_URL =
	'https://member.rakuten-sec.co.jp/app/ass_all_possess_lst.do;';
const MARKET_URL = 'https://member.rakuten-sec.co.jp/app/market_top.do;';
const FAVORITE_LIST =
	'https://member.rakuten-sec.co.jp/app/info_jp_prc_reg_lst.do;';

const INTERVAL = 1;

const sleep = (time: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

const getBvSessionId = async (page: Page): Promise<string> => {
	for (let index = 0; index < 10; index++) {
		if (page.url().includes('BV_SessionID=')) {
			return page.url().split(';')[1].split('?')[0];
		}
		await sleep(INTERVAL);
	}
	return page.url().split(';')[1].split('?')[0];
};

(async () => {
	const username = process.env.USERNAME;
	if (!username) {
		console.error(
			'username is not present in .env.\nSet USERNAME in .env to root dir. \n e.g. \n echo USERNAME=${USERNAME} > .env'
		);
		return;
	}
	const password = getPassword(username);
	if (!password) {
		console.error(
			'password is not present in KeyChainAccess. Set service: RAKUTEN_SEC, Account: username, Password: password.'
		);
		return;
	}
	const browser = await puppeteer.launch({
		channel: 'chrome',
		headless: true,
	});
	const page = await browser.newPage();
	await page.goto(LOGIN_URL);
	await page.type('input[id="form-login-id"]', username);
	await page.type('input[id="form-login-pass"]', password);
	await page.click('button[id="login-btn"]');

	const bvSessionId = await getBvSessionId(page);

	await page.goto(MARKET_URL + bvSessionId + '?eventType=init');

	const initializedIndex: Index = {
		current: 0,
		diffAmount: 0,
		diffRate: 0,
		dateTime: '0',
	};

	const initializedMarket: Market = {
		yenPerDollar: initializedIndex,
		bonds10: initializedIndex,
	};

	const market: Market = await page.evaluate((resultMarcket: Market) => {
		for (let index = 0; index < 20; index++) {
			const target = document.querySelector(
				'td[id="auto_update_market_index_exchange_XXX31_ask"]'
			);
			if (!target) {
				sleep(INTERVAL);
				continue;
			}

			resultMarcket.yenPerDollar.current = Number(
				(
					document.querySelector(
						'td[id="auto_update_market_index_exchange_XXX31_ask"]'
					) as HTMLTableElement
				).innerText
			);
			resultMarcket.yenPerDollar.diffAmount = Number(
				(
					document.querySelector(
						'td[id="auto_update_market_index_exchange_XXX31_net_change"]'
					) as HTMLTableElement
				).innerText
			);
			resultMarcket.yenPerDollar.diffRate = Number(
				(
					document.querySelector(
						'td[id="auto_update_market_index_exchange_XXX31_bid_percent_change"]'
					) as HTMLTableElement
				).innerText.replace('%', '')
			);
			resultMarcket.yenPerDollar.dateTime = (
				document.querySelector(
					'td[id="auto_update_market_index_exchange_XXX31_now_date"]'
				) as HTMLTableElement
			).innerText;

			resultMarcket.bonds10.current = Number(
				(
					document.querySelector(
						'td[id="auto_update_market_index_bond_BD005_annualized_yield"]'
					) as HTMLTableElement
				).innerText
			);
			resultMarcket.bonds10.diffRate = Number(
				(
					document.querySelector(
						'td[id="auto_update_market_index_bond_BD005_net_change"]'
					) as HTMLTableElement
				).innerText.replace('%', '')
			);
			resultMarcket.bonds10.dateTime = (
				document.querySelector(
					'td[id="auto_update_market_index_bond_BD005_now_date"]'
				) as HTMLTableElement
			).innerText;
			break;
		}
		return resultMarcket;
	}, initializedMarket);

	await page.goto(
		ALL_ASSET_LIST_URL +
			bvSessionId +
			'?eventType=directInit&l-id=mem_pc_top_all-possess-lst&gmn=H&smn=01&lmn=&fmn='
	);

	const initializedAsset: Asset = {
		total: { amount: 0, diff: 0, diffRate: 0 },
		possessList: [],
	};

	const asset: Asset = await page.evaluate((asset: Asset) => {
		for (let index = 0; index < 10; index++) {
			const target = document.querySelector(
				'td[class="R1 B3 f105p"] span[class="fb"]'
			);
			if (!target) {
				sleep(INTERVAL);
				continue;
			}

			const amount = Number(
				(
					document.querySelector(
						'td[class="R1 B3 f105p"] span[class="fb"]'
					) as HTMLSpanElement
				).innerText.replace(/円|,/g, '')
			);
			asset.total.amount = amount;
			const diff = Number(
				(
					document.querySelector('span[class="PLY"]') as HTMLSpanElement
				).innerText.replace(/円|,/g, '')
			);
			asset.total.diff = diff;
			asset.total.diffRate = (diff / amount) * 100;

			const tableProcessData = document.getElementById('table_possess_data');
			if (!tableProcessData) return asset;
			const possessList = tableProcessData.getElementsByTagName('tr');
			for (let index = 3; index < possessList.length; index++) {
				const dataRaw = possessList[index].getElementsByTagName('td');
				const securityType = dataRaw[0].innerText;
				if (securityType == '米国株式') {
					const currentPrice = Number(
						dataRaw[6]
							.getElementsByTagName('div')[0]
							.innerText.replace(/USD|,/g, '')
					);
					const diff = Number(
						dataRaw[6]
							.getElementsByTagName('div')[1]
							.innerText.replace(/USD|,/g, '')
					);
					const totalAmount = Number(
						dataRaw[7]
							.getElementsByTagName('div')[0]
							.innerText.replace(/円|,/g, '')
					);
					const profit = Number(
						dataRaw[7]
							.getElementsByTagName('div')[2]
							.innerText.replace(/円|,|\n|\t/g, '')
					);
					let profitRate = 0;
					if (profit >= 0) {
						profitRate = profit / totalAmount;
					} else {
						profitRate = profit / (totalAmount - profit);
					}

					const possess: Possess = {
						securityType: securityType,
						name: dataRaw[1].innerText,
						accountType: dataRaw[3].innerText,
						buyPrice: Number(dataRaw[5].innerText.replace(/USD|,/g, '')),
						currentPrice: currentPrice,
						diff: diff,
						diffRate: (diff / currentPrice) * 100,
						count: Number(dataRaw[4].innerText.replace(/株|,/g, '')),
						totalAmount: totalAmount,
						profit: profit,
						profitRate: profitRate * 100,
					};
					asset.possessList.push(possess);
				} else if (securityType == '投資信託') {
					const currentPrice = Number(
						dataRaw[5]
							.getElementsByTagName('div')[0]
							.innerText.replace(/円|,/g, '')
					);
					const diff = Number(
						dataRaw[5]
							.getElementsByTagName('div')[1]
							.innerText.replace(/円|,/g, '')
					);
					const totalAmount = Number(
						dataRaw[6]
							.getElementsByTagName('div')[0]
							.innerText.replace(/円|,/g, '')
					);
					const profit = Number(
						dataRaw[6]
							.getElementsByTagName('div')[2]
							.innerText.replace(/円|,|\n|\t/g, '')
					);
					let profitRate = 0;
					if (profit >= 0) {
						profitRate = profit / totalAmount;
					} else {
						profitRate = profit / (totalAmount - profit);
					}
					const possess: Possess = {
						securityType: securityType,
						name: dataRaw[1].innerText,
						accountType: dataRaw[2].innerText.replace('\n', ''),
						buyPrice: Number(dataRaw[4].innerText.replace(/円|,/g, '')),
						currentPrice: currentPrice,
						diff: diff,
						diffRate: (diff / currentPrice) * 100,
						count: Number(dataRaw[3].innerText.replace(/口|,/g, '')),
						totalAmount: totalAmount,
						profit: profit,
						profitRate: profitRate * 100,
					};
					asset.possessList.push(possess);
				} else if (securityType == '外貨預り金') {
					const currentPrice = Number(
						dataRaw[5]
							.getElementsByTagName('div')[0]
							.innerText.replace(/円\/USD|,/g, '')
					);
					const diff = Number(
						dataRaw[5]
							.getElementsByTagName('div')[1]
							.innerText.replace(/円|,/g, '')
					);
					const totalAmount = Number(
						dataRaw[6]
							.getElementsByTagName('div')[0]
							.innerText.replace(/円|,/g, '')
					);
					const profit = Number(
						dataRaw[6]
							.getElementsByTagName('div')[2]
							.innerText.replace(/円|,|\n|\t/g, '')
					);
					let profitRate = 0;
					if (profit >= 0) {
						profitRate = profit / totalAmount;
					} else {
						profitRate = profit / (totalAmount - profit);
					}
					const possess: Possess = {
						securityType: securityType,
						name: dataRaw[1].innerText,
						accountType: dataRaw[2].innerText.replace('\n', ''),
						buyPrice: Number(dataRaw[4].innerText.replace(/円\/USD|,/g, '')),
						currentPrice: currentPrice,
						diff: diff,
						diffRate: (diff / currentPrice) * 100,
						count: Number(dataRaw[3].innerText.replace(/USD|,/g, '')),
						totalAmount: totalAmount,
						profit: profit,
						profitRate: profitRate * 100,
					};
					asset.possessList.push(possess);
				}
			}
			break;
		}
		return asset;
	}, initializedAsset);

	await page.goto(FAVORITE_LIST + bvSessionId + '?eventType=init');
	const favoriteList: Favorite[] = await page.evaluate((list: Favorite[]) => {
		for (let index = 0; index < 20; index++) {
			const target = document.getElementsByClassName('tbl-data-01');
			if (!target) {
				sleep(INTERVAL);
				continue;
			}

			const trList = document
				.getElementsByClassName('tbl-data-01')[0]
				.getElementsByTagName('tbody')[0];
			for (
				let index = 1;
				index < trList.getElementsByTagName('tr').length - 1;
				index++
			) {
				const element = trList.getElementsByTagName('tr')[index];
				const code = Number(element.getElementsByTagName('td')[1].innerText);
				const name = element.getElementsByTagName('td')[3].innerText;
				const market = element.getElementsByTagName('td')[6].innerText;
				const current = Number(
					element.getElementsByTagName('td')[7].innerText.replace(/↓|↑|,/g, '')
				);
				const updatedAt = element.getElementsByTagName('td')[8].innerText;
				const diff = Number(element.getElementsByTagName('td')[9].innerText);
				const diffRate = Number(
					element.getElementsByTagName('td')[10].innerText.replace('%', '')
				);
				const transaction = Number(
					element.getElementsByTagName('td')[11].innerText.replace(/株|,/g, '')
				);
				const favorite: Favorite = {
					code: code,
					name: name,
					market: market,
					current: current,
					updatedAt: updatedAt,
					diff: diff,
					diffRate: diffRate,
					transaction: transaction,
				};
				list.push(favorite);
			}
			break;
		}
		return list;
	}, []);

	asset.possessList = asset.possessList.sort((f, s) => {
		if (f.securityType > s.securityType) return -1;
		if (f.securityType < s.securityType) return 1;
		if (f.accountType > s.accountType) return -1;
		if (f.accountType < s.accountType) return 1;
		if (f.profitRate > s.profitRate) return -1;
		if (f.profitRate < s.profitRate) return 1;
		return 0;
	});

	const result: Result = {
		market: market,
		asset: asset,
		favoriteList: favoriteList,
	};

	console.log('%o', result);
	await browser.close();
})();
