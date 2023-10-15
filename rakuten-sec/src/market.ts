import { Page } from 'puppeteer-core';
import { sleep } from './index';

export type Market = {
	yenPerDollar: Index;
	bonds10: Index;
};

type MarketStrings = {
	yenPerDollar: IndexStrings;
	bonds10: IndexStrings;
};

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

export const getMarket = async (
	page: Page,
	bvSessionId: string
): Promise<Market> => {
	const MARKET_URL = 'https://member.rakuten-sec.co.jp/app/market_top.do;';
	await page.goto(MARKET_URL + bvSessionId + '?eventType=init');
	await sleep(3);
	const marketStrings = await makeMarketStrings(page);
	return makeMarket(marketStrings);
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
