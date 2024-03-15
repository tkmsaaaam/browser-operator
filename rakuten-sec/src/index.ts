import puppeteer, { Browser, Page } from 'puppeteer-core';
import { getPassword } from './authentication';
import { Asset, getAsset } from './asset';
import { Market, getMarket } from './market';
import { Favorite, getFavoriteList } from './favorite';
import * as dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import log4js from 'log4js';

type Result = {
	market: Market;
	asset: Asset;
	favoriteList: Favorite[];
};

const logger = log4js.getLogger();
logger.level = 'all';

export const sleep = (time: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

const login = async (
	page: Page,
	username: string,
	password: string,
): Promise<Page> => {
	const LOGIN_URL = 'https://www.rakuten-sec.co.jp/';
	logger.info(`login is started. username: ${username}`);
	await page.goto(LOGIN_URL);
	await page.type('input[id="form-login-id"]', username);
	await page.type('input[id="form-login-pass"]', password);
	await page.click('button[id="login-btn"]');
	return page;
};

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
		logger.error(
			'username is not present in .env.\nSet USERNAME in .env to root dir. \n e.g. \n echo USERNAME=${USERNAME} > .env',
		);
		return;
	}
	const password = getPassword(username);
	if (!password) {
		logger.error(
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

	const browserPage = await browser.newPage();
	const page = await login(browserPage, username, password);

	const bvSessionId = await getBvSessionId(page);

	logger.info('Data is getting...');
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
		logger.info('exporting...');
		fs.writeFile('./output.txt', JSON.stringify(result, null, 2), err => {
			if (err) {
				logger.error(err);
			} else {
				logger.info('./output.txt is created.');
			}
		});
	}
	console.log('%o', result);
	await browser.close();
})();
