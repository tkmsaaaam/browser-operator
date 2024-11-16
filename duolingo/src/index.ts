import puppeteer, { Page } from 'puppeteer-core';
import * as dotenv from 'dotenv';
dotenv.config();
import log4js from 'log4js';

const TOP_URL = 'https://www.duolingo.com';

type Result = {
	order: Number;
	map: Map<Number, Number>;
};

const logger = log4js.getLogger();
logger.level = 'all';

const login = async (
	page: Page,
	username: string,
	password: string,
): Promise<Page> => {
	logger.info(`login is started. username: ${username}`);
	await page.goto(TOP_URL);
	await page.waitForSelector('[data-test="have-account"]');
	await page.click('[data-test="have-account"]');
	await page.type('input[id="web-ui1"]', username);
	await page.type('input[id="web-ui2"]', password);
	await page.waitForSelector('[type="submit"]');
	await page.click('[type="submit"]');
	await page.waitForSelector('._27IMa');
	logger.info(`login is succeeded. username: ${username}`);
	return page;
};

const getLeaderboard = async (page: Page): Promise<Result> => {
	await page.goto('https://www.duolingo.com/leaderboard');
	await page.waitForSelector('.MytTp');
	await page.waitForSelector('._5W_8K');
	await page.waitForSelector('._1kz8P');
	await page.waitForSelector('._1OKd4');
	const res: Result = {
		order: 0,
		map: new Map(),
	};
	return await page.evaluate((result: Result) => {
		const list: HTMLCollectionOf<Element> =
			document.getElementsByClassName('_5W_8K');
		for (let i = 0; i < list.length; i++) {
			const key = parseInt(
				list[i].getElementsByClassName('_1kz8P')[0].innerHTML,
			);
			const value = parseInt(
				list[i]
					.getElementsByClassName('_1OKd4')[0]
					.innerHTML.replace(' XP', ''),
			);
			result.map.set(key, value);
		}
		result.order = parseInt(
			document
				.getElementsByClassName('MytTp')[0]
				.getElementsByTagName('span')[0].innerText,
		);
		return result;
	}, res);
};

(async (): Promise<void> => {
	const username = process.env.EMAIL;
	if (!username) {
		logger.error(
			'username is not present in .env.\nSet USERNAME in .env to root dir. \n e.g. \n echo USERNAME=${USERNAME} > .env',
		);
		return;
	}
	const password = process.env.PASSWORD;
	if (!password) {
		logger.error(
			'password is not present in KeyChainAccess. Set service: RAKUTEN_CARD, Account: username, Password: password.',
		);
		return;
	}
	const browser = await puppeteer.launch({
		channel: 'chrome',
		headless: false,
	});
	const browserPage = await browser.newPage();

	browserPage.on('request', request => {
		if (
			request.url().startsWith('https://accounts.google.com') ||
			request.url().startsWith('https://analytics.google.com') ||
			request.url().startsWith('https://cdn.cookielaw.org') ||
			request.url().startsWith('https://d35aaqx5ub95lt.cloudfront.net/css') ||
			request
				.url()
				.startsWith('https://d35aaqx5ub95lt.cloudfront.net/images') ||
			request.url().startsWith('https://fonts.gstatic.com') ||
			request.url().startsWith('https://googleads.g.doubleclick.net') ||
			request.url().startsWith('https://www.google.co.jp') ||
			request.url().startsWith('https://www.google.com') ||
			request.url().startsWith('https://www.facebook.com')
		) {
			request.abort().catch(err => console.error(err));
		} else {
			request.continue().catch(err => console.error(err));
		}
	});

	const page = await login(browserPage, username, password);

	const result = await getLeaderboard(page);

	logger.info(`current order: ${result.order}, boader: ${result.map.get(25)}`);
	await browser.close();
})();
