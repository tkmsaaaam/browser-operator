import puppeteer, { Page } from 'puppeteer-core';
import * as dotenv from 'dotenv';
dotenv.config();
import log4js from 'log4js';

const TOP_URL = 'https://www.duolingo.com';

type Result = {
	streak: undefined | boolean;
	rank: number;
	score: number;
	passing: number;
	errors: Error[];
};

const logger = log4js.getLogger();
logger.level = 'all';
const sleep = (time: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

const login = async (
	page: Page,
	username: string,
	password: string,
): Promise<Page> => {
	logger.info(`login is started. username: ${username}`);
	await page.goto(TOP_URL);
	await page.waitForSelector('[data-test="have-account"]');
	await page.click('[data-test="have-account"]');
	await page.waitForSelector('input[id="web-ui1"]');
	await page.waitForSelector('input[id="web-ui2"]');
	await page.waitForSelector('button[type="submit"]');
	await page.type('input[id="web-ui1"]', username);
	await page.type('input[id="web-ui2"]', password);
	await page.click('button[type="submit"]');
	await page.waitForSelector('._27IMa');
	logger.info(`login is succeeded. username: ${username}`);
	return page;
};

const makeResult = async (page: Page): Promise<Result> => {
	await page.goto(TOP_URL + '/leaderboard');
	await sleep(1);
	await page.waitForSelector('.MytTp');
	await page.waitForSelector('._3kvGS._5W_8K._7trGg');
	await page.waitForSelector('._1kz8P');
	await page.waitForSelector('._1OKd4');
	await page.waitForSelector('[data-test="streak-menu"]');
	const res: Result = {
		streak: undefined,
		rank: 0,
		score: 0,
		passing: 0,
		errors: [],
	};
	return await page.evaluate((result: Result) => {
		const list: HTMLCollectionOf<Element> =
			document.getElementsByClassName('_5W_8K');
		if (list.length === 0) {
			result.errors.push(new Error(`No results found leaderboard`));
		}
		const boarder = list[24].getElementsByClassName('_1OKd4');
		if (boarder.length == 0) {
			result.errors.push(new Error(`No results found passing score`));
			return result;
		}
		result.passing = parseInt(boarder[0].innerHTML.replace(' XP', ''));
		const myRank = document.getElementsByClassName('MytTp');
		if (myRank.length == 0) {
			result.errors.push(new Error(`No results found my rank`));
			return result;
		}
		const order = myRank[0].getElementsByClassName('_1kz8P');
		if (order.length == 0) {
			result.errors.push(new Error(`No results found rank`));
			return result;
		}
		const score = myRank[0].getElementsByClassName('_1OKd4');
		if (score.length == 0) {
			result.errors.push(new Error(`No results found my score`));
			return result;
		}
		result.rank = parseInt(order[0].innerHTML);
		result.score = parseInt(score[0].innerHTML.replace(' XP', ''));
		result.streak =
			document.querySelector(
				'img[src="https://d35aaqx5ub95lt.cloudfront.net/images/icons/398e4298a3b39ce566050e5c041949ef.svg"]',
			) != null;
		return result;
	}, res);
};

const main = async (): Promise<void> => {
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
	// await browserPage.setRequestInterception(true);

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
	page.setDefaultNavigationTimeout(120000); // 2m

	const result = await makeResult(page);

	if (result.errors.length > 0) {
		for (const error of result.errors) {
			logger.error(error.message);
		}
		await browser.close();
		return;
	}
	if (result.rank > 25) {
		logger.info('in danger zone');
	}
	logger.info(
		`streak: ${result.streak}, current rank: ${result.rank}, current score: ${result.score}, passing score: ${result.passing}, diff: ${result.score - result.passing}`,
	);
	if (process.env.FILE_OUTPUT == 'true') {
		log4js.configure({
			appenders: {
				out: { type: 'stdout' },
				file: {
					type: 'dateFile',
					filename: 'output.txt',
					numBackups: 0,
					layout: { type: 'pattern', pattern: '%m' },
				},
			},
			categories: {
				default: { appenders: ['out'], level: 'all' },
				file: { appenders: ['file'], level: 'all' },
			},
		});
		logger.info('exporting...');
		const fileLogger = log4js.getLogger('file');
		fileLogger.info(JSON.stringify(result, null, 2));
	}
	logger.info(JSON.stringify(result, null, 2));
	await browser.close();
};

if (process.env.NODE_ENV != 'test') {
	main().then();
}
