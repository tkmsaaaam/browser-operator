import puppeteer, { Page } from 'puppeteer-core';
import { getPassword } from './authentication';

type IndexStrings = {
	current: string;
	diffAmount: string;
	diffRate: string;
	dateTime: string;
};

type Index = {
	current: number;
	diffAmount: number;
	diffRate: number;
	dateTime: string;
};

type MarketStrings = {
	yenPerDollar: IndexStrings;
	bonds10: IndexStrings;
};

type Market = {
	yenPerDollar: Index;
	bonds10: Index;
};

type AssetStrings = {
	total: TotalStrings;
	possessList: PossessStrings[];
};

type Asset = {
	total: Total;
	possessList: Possess[];
};

type TotalStrings = {
	amount: string;
	diff: string;
};

type Total = {
	amount: number;
	diff: number;
	diffRate: number;
};

type PossessStrings = {
	securityType: string;
	name: string;
	accountType: string;
	buyPrice: string;
	currentPrice: string;
	diff: string;
	count: string;
	totalAmount: string;
	profit: string;
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

type FavoriteStrings = {
	code: string;
	name: string;
	market: string;
	current: string;
	updatedAt: string;
	diff: string;
	diffRate: string;
	transaction: string;
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

const makeMarketStrings = async (page: Page): Promise<MarketStrings> => {
	const indexStrings: IndexStrings = {
		current: '0',
		diffAmount: '0',
		diffRate: '0',
		dateTime: '0',
	};

	const market: MarketStrings = {
		yenPerDollar: indexStrings,
		bonds10: indexStrings,
	};
	return await page.evaluate((resultMarcket: MarketStrings) => {
		for (let index = 0; index < 20; index++) {
			const target = document.querySelector(
				'td[id="auto_update_market_index_exchange_XXX31_ask"]'
			);
			if (!target) {
				sleep(INTERVAL);
				continue;
			}

			resultMarcket.yenPerDollar.current = (
				document.querySelector(
					'td[id="auto_update_market_index_exchange_XXX31_ask"]'
				) as HTMLTableElement
			).innerText;
			resultMarcket.yenPerDollar.diffAmount = (
				document.querySelector(
					'td[id="auto_update_market_index_exchange_XXX31_net_change"]'
				) as HTMLTableElement
			).innerText;
			resultMarcket.yenPerDollar.diffRate = (
				document.querySelector(
					'td[id="auto_update_market_index_exchange_XXX31_bid_percent_change"]'
				) as HTMLTableElement
			).innerText;
			resultMarcket.yenPerDollar.dateTime = (
				document.querySelector(
					'td[id="auto_update_market_index_exchange_XXX31_now_date"]'
				) as HTMLTableElement
			).innerText;

			resultMarcket.bonds10.current = (
				document.querySelector(
					'td[id="auto_update_market_index_bond_BD005_annualized_yield"]'
				) as HTMLTableElement
			).innerText;
			resultMarcket.bonds10.diffRate = (
				document.querySelector(
					'td[id="auto_update_market_index_bond_BD005_net_change"]'
				) as HTMLTableElement
			).innerText;
			resultMarcket.bonds10.dateTime = (
				document.querySelector(
					'td[id="auto_update_market_index_bond_BD005_now_date"]'
				) as HTMLTableElement
			).innerText;
			break;
		}
		return resultMarcket;
	}, market);
};

const makeIndex = (indexStrings: IndexStrings): Index => {
	return {
		current: Number(indexStrings.current),
		diffAmount: Number(indexStrings.diffAmount),
		diffRate: Number(indexStrings.diffRate.replace('%', '')),
		dateTime: indexStrings.dateTime,
	};
};

const makeMarket = (marketStrings: MarketStrings): Market => {
	return {
		yenPerDollar: makeIndex(marketStrings.yenPerDollar),
		bonds10: makeIndex(marketStrings.bonds10),
	};
};

const makeAssetStrings = async (page: Page): Promise<AssetStrings> => {
	const asset: AssetStrings = {
		total: { amount: '0', diff: '0' },
		possessList: [],
	};
	return await page.evaluate((asset: AssetStrings) => {
		for (let index = 0; index < 10; index++) {
			const target = document.querySelector(
				'td[class="R1 B3 f105p"] span[class="fb"]'
			);
			if (!target) {
				sleep(INTERVAL);
				continue;
			}

			asset.total.amount = (
				document.querySelector(
					'td[class="R1 B3 f105p"] span[class="fb"]'
				) as HTMLSpanElement
			).innerText;

			asset.total.diff = (
				document.querySelector('span[class="PLY"]') as HTMLSpanElement
			).innerText;

			const tableProcessData = document.getElementById('table_possess_data');
			if (!tableProcessData) return asset;
			const possessList = tableProcessData.getElementsByTagName('tr');
			for (let index = 3; index < possessList.length; index++) {
				const dataRaw = possessList[index].getElementsByTagName('td');
				const securityType = dataRaw[0].innerText;
				if (securityType == '米国株式') {
					const possess: PossessStrings = {
						securityType: securityType,
						name: dataRaw[1].innerText,
						accountType: dataRaw[3].innerText,
						buyPrice: dataRaw[5].innerText,
						currentPrice: dataRaw[6].getElementsByTagName('div')[0].innerText,
						diff: dataRaw[6].getElementsByTagName('div')[1].innerText,
						count: dataRaw[4].innerText,
						totalAmount: dataRaw[7].getElementsByTagName('div')[0].innerText,
						profit: dataRaw[7].getElementsByTagName('div')[2].innerText,
					};
					asset.possessList.push(possess);
				} else {
					const possess: PossessStrings = {
						securityType: securityType,
						name: dataRaw[1].innerText,
						accountType: dataRaw[2].innerText,
						buyPrice: dataRaw[4].innerText,
						currentPrice: dataRaw[5].getElementsByTagName('div')[0].innerText,
						diff: dataRaw[5].getElementsByTagName('div')[1].innerText,
						count: dataRaw[3].innerText,
						totalAmount: dataRaw[6].getElementsByTagName('div')[0].innerText,
						profit: dataRaw[6].getElementsByTagName('div')[2].innerText,
					};
					asset.possessList.push(possess);
				}
			}
			break;
		}
		return asset;
	}, asset);
};

const makeTotal = (totalStrings: TotalStrings): Total => {
	const amount = Number(totalStrings.amount.replace(/円|,/g, ''));
	const diff = Number(totalStrings.diff.replace(/円|,/g, ''));
	return {
		amount: amount,
		diff: diff,
		diffRate: (diff / amount) * 100,
	};
};

const makePossess = (possessStrings: PossessStrings): Possess => {
	const currentPrice = Number(
		possessStrings.currentPrice.replace(/円\/USD|円|USD|,/g, '')
	);
	const diff = Number(possessStrings.diff.replace(/円|USD|円\/USD|,/g, ''));
	const profit = Number(possessStrings.profit.replace(/円|,|\n|\t/g, ''));
	const totalAmount = Number(possessStrings.totalAmount.replace(/円|,/g, ''));
	let profitRate = 0;
	if (profit >= 0) {
		profitRate = profit / totalAmount;
	} else {
		profitRate = profit / (totalAmount - profit);
	}
	return {
		securityType: possessStrings.securityType,
		name: possessStrings.name,
		accountType: possessStrings.accountType,
		buyPrice: Number(possessStrings.buyPrice.replace(/円|USD|円\/USD|,/g, '')),
		currentPrice: currentPrice,
		diff: diff,
		diffRate: (diff / currentPrice) * 100,
		count: Number(possessStrings.count.replace(/口|株|USD|,/g, '')),
		totalAmount: totalAmount,
		profit: profit,
		profitRate: profitRate * 100,
	};
};

const makeAsset = (assetStrings: AssetStrings): Asset => {
	return {
		total: makeTotal(assetStrings.total),
		possessList: assetStrings.possessList.map(p => makePossess(p)),
	};
};

const makeFavoriteStrings = async (page: Page): Promise<FavoriteStrings[]> => {
	return await page.evaluate((list: FavoriteStrings[]) => {
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
				const element = trList
					.getElementsByTagName('tr')
					// eslint-disable-next-line no-unexpected-multiline
					[index].getElementsByTagName('td');
				const favorite: FavoriteStrings = {
					code: element[1].innerText,
					name: element[3].innerText,
					market: element[6].innerText,
					current: element[7].innerText.replace(/↓|↑|,/g, ''),
					updatedAt: element[8].innerText,
					diff: element[9].innerText,
					diffRate: element[10].innerText.replace('%', ''),
					transaction: element[11].innerText.replace(/株|,/g, ''),
				};
				list.push(favorite);
			}
			break;
		}
		return list;
	}, []);
};

const makeFavorite = (favoriteStrings: FavoriteStrings): Favorite => {
	return {
		code: Number(favoriteStrings.code),
		name: favoriteStrings.name,
		market: favoriteStrings.market,
		current: Number(favoriteStrings.current.replace(/↓|↑|,/g, '')),
		updatedAt: favoriteStrings.updatedAt,
		diff: Number(favoriteStrings.diff),
		diffRate: Number(favoriteStrings.diffRate.replace('%', '')),
		transaction: Number(favoriteStrings.transaction.replace(/株|,/g, '')),
	};
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
	const marketStrings = await makeMarketStrings(page);
	const market = makeMarket(marketStrings);

	await page.goto(
		ALL_ASSET_LIST_URL +
			bvSessionId +
			'?eventType=directInit&l-id=mem_pc_top_all-possess-lst&gmn=H&smn=01&lmn=&fmn='
	);

	const assetStrings = await makeAssetStrings(page);
	const asset = makeAsset(assetStrings);

	await page.goto(FAVORITE_LIST + bvSessionId + '?eventType=init');
	const favoriteStringsList = await makeFavoriteStrings(page);
	const favoriteList = favoriteStringsList.map(f => makeFavorite(f));

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
