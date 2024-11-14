import puppeteer, { Browser, Page } from 'puppeteer-core';
import { getPassword } from './authentication';
import { Asset, getAsset } from './asset';
import { Market, getMarket } from './market';
import { Favorite, getFavoriteList } from './favorite';
import * as dotenv from 'dotenv';
dotenv.config();
import log4js from 'log4js';

type Result = {
	market: Market;
	asset: Asset;
	favoriteList: Favorite[];
};

const logger = log4js.getLogger();
logger.level = 'all';

const login = async (
	page: Page,
	username: string,
	password: string,
): Promise<Page> => {
	const LOGIN_URL = 'https://www.rakuten-sec.co.jp/ITS/V_ACT_Login.html';
	logger.info(`login is started. username: ${username}`);
	await page.goto(LOGIN_URL, { timeout: 300000 });
	await page.waitForSelector('button[id="login-btn"]', {
		timeout: 300000,
	});
	await page.type('input[id="form-login-id"]', username);
	await page.type('input[id="form-login-pass"]', password);
	await page.click('button[id="login-btn"]');
	await page.waitForSelector('div[id="table_data"]', {
		timeout: 300000,
	});
	return page;
};

const getBvSessionId = async (page: Page): Promise<string> => {
	return page.url().split(';')[1].split('?')[0];
};

const main = async () => {
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
	await browserPage.setRequestInterception(true);
	browserPage.on('request', request => {
		if (
			request.url().startsWith('https://cdnjs.cloudflare.com') ||
			request.url().startsWith('https://code.usergram.info') ||
			request
				.url()
				.startsWith('https://c.marsflag.com/mf/mfx/1.0-latest/js/') ||
			request.url().startsWith('https://fonts.googleapis.com/css') ||
			request.url().startsWith('https://jp.rakuten-static.com/1') ||
			request.url().startsWith('https://rakuten-sec-me.marsflag.com/') ||
			request
				.url()
				.startsWith('https://member.rakuten-sec.co.jp/member/assets') ||
			request
				.url()
				.startsWith('https://member.rakuten-sec.co.jp/member/css/') ||
			request
				.url()
				.startsWith('https://member.rakuten-sec.co.jp/member/images') ||
			// request.url().startsWith('https://member.rakuten-sec.co.jp/member/js/')
			request
				.url()
				.startsWith('https://member.rakuten-sec.co.jp/member/html/') ||
			request.url().startsWith('https://www.rakuten-sec.co.jp/ITS/resource/') ||
			request.url().startsWith('https://r.r10s.jp') ||
			request.url().startsWith('https://www.googleadservices.com/pagead') ||
			request.url().startsWith('https://www.googletagmanager.com/') ||
			request.url().startsWith('https://www.rakuten.co.jp/com/advance/') ||
			request.url().startsWith('https://www.rakuten-sec.co.jp/web/images') ||
			request
				.url()
				.startsWith('https://www.rakuten-sec.co.jp/web/shared/css') ||
			request
				.url()
				.startsWith('https://www.rakuten-sec.co.jp/web/shared/images') ||
			request
				.url()
				.startsWith('https://www.rakuten-sec.co.jp/web/shared/img') ||
			request.url().startsWith('https://www.trkd-asia.com/') ||
			request.url().startsWith('https://s.yjtag.jp/tag.js') ||
			request.url().includes('akamaihd.net/')
		) {
			request.abort().catch(err => console.error(err));
		} else {
			request.continue().catch(err => console.error(err));
		}
	});
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
