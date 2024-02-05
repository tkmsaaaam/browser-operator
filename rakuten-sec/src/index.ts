import puppeteer, { Browser, Page } from 'puppeteer-core';
import { getPassword } from './authentication';
import { Asset, getAsset } from './asset';
import { Market, getMarket } from './market';
import { Favorite, getFavoriteList } from './favorite';
import * as dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';

type Result = {
	market: Market;
	asset: Asset;
	favoriteList: Favorite[];
};

export const sleep = (time: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

const getBvSessionId = async (page: Page): Promise<string> => {
	for (let index = 0; index < 10; index++) {
		const INTERVAL = 1;
		await sleep(INTERVAL);
		if (page.url().includes('BV_SessionID=')) {
			return page.url().split(';')[1].split('?')[0];
		}
	}
	return page.url().split(';')[1].split('?')[0];
};

(async () => {
	const username = process.env.USERNAME;
	if (!username) {
		console.error(
			'username is not present in .env.\nSet USERNAME in .env to root dir. \n e.g. \n echo USERNAME=${USERNAME} > .env',
		);
		return;
	}
	const password = getPassword(username);
	if (!password) {
		console.error(
			'password is not present in KeyChainAccess. Set service: RAKUTEN_SEC, Account: username, Password: password.',
		);
		return;
	}
	const executablePath = process.env.EXECUTABLE_PATH;
	let browser: Browser;
	if (executablePath) {
		browser = await puppeteer.launch({
			channel: 'chrome',
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
			executablePath: executablePath,
		});
	} else {
		browser = await puppeteer.launch({
			channel: 'chrome',
			headless: true,
		});
	}

	const page = await browser.newPage();
	const LOGIN_URL = 'https://www.rakuten-sec.co.jp/';
	await page.goto(LOGIN_URL);
	await page.type('input[id="form-login-id"]', username);
	await page.type('input[id="form-login-pass"]', password);
	await page.click('button[id="login-btn"]');

	const bvSessionId = await getBvSessionId(page);

	const market = await getMarket(page, bvSessionId);

	const asset = await getAsset(page, bvSessionId);

	const favoriteList = await getFavoriteList(page, bvSessionId);

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

	if (process.env.FILE_OUTPUT == 'true') {
		fs.writeFile('./output.txt', JSON.stringify(result, null, 2), err => {
			if (err) {
				console.log(err);
			}
		});
	}
	console.log('%o', result);
	await browser.close();
})();
