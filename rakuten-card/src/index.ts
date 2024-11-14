import puppeteer, { Page } from 'puppeteer-core';
import * as dotenv from 'dotenv';
dotenv.config();
import { getPassword } from './authentication';
import { existsSync, mkdirSync } from 'fs';
import log4js from 'log4js';

const LOGIN_URL = 'https://www.rakuten-card.co.jp/e-navi/index.xhtml';
const TOP_URL = 'https://www.rakuten-card.co.jp/e-navi/members/index.xhtml';
const DOWNLOAD_LIST_URL =
	'https://www.rakuten-card.co.jp/e-navi/members/statement/download-list.xhtml';

const DOWNLOAD_CSV_URL =
	'https://www.rakuten-card.co.jp/e-navi/members/statement/index.xhtml?tabNo=1';

const sleep = (time: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

const logger = log4js.getLogger();
logger.level = 'all';

const login = async (
	page: Page,
	username: string,
	password: string,
): Promise<Page | Error> => {
	logger.info(`login is started. username: ${username}`);
	await page.goto(LOGIN_URL);
	await page.type('input[id="u"]', username);
	await page.type('input[id="p"]', password);
	await Promise.all([
		page.waitForNavigation({ waitUntil: 'load' }),
		page.click('input[id="loginButton"]'),
	]);
	const url = page.url();
	if (url == TOP_URL) {
		logger.info(`login is succeeded. username: ${username}`);
		return page;
	} else {
		return new Error(
			`login is failed. username: ${username}, current url: ${url}`,
		);
	}
};

const clickLatestPdfUrl = async (page: Page, dir: string): Promise<void> => {
	const selector =
		'a[href="/e-navi/members/statement/download-list.xhtml?downloadAsPdf=0"]';
	await Promise.all([
		page.waitForSelector(selector),
		page.goto(DOWNLOAD_LIST_URL),
	]);
	await downloadFile(page, dir, selector);
};

const clickLatestCsvUrl = async (page: Page, dir: string): Promise<void> => {
	const selector =
		'a[href="/e-navi/members/statement/index.xhtml?downloadAsCsv=1"]';
	await Promise.all([
		page.waitForSelector(selector),
		page.goto(DOWNLOAD_CSV_URL),
	]);
	await downloadFile(page, dir, selector);
};

const downloadFile = async (page: Page, dir: string, element: string) => {
	const client = await page.createCDPSession();
	await client.send('Page.setDownloadBehavior', {
		behavior: 'allow',
		downloadPath: dir,
	});
	await Promise.all([page.click(element), sleep(10)]);
};

const getCardCount = async (page: Page) => {
	return await page.evaluate(
		() =>
			(
				document.querySelector(
					'select[id="cardChangeForm:cardtype"]',
				) as HTMLSelectElement
			).options.length,
	);
};

const makeBaseDir = (): string => {
	const envDir = process.env.BASE_DIR;
	if (envDir && existsSync(envDir)) {
		if (envDir.endsWith('/')) {
			return envDir;
		} else {
			return envDir + '/';
		}
	} else {
		if (!existsSync('./downloads')) {
			mkdirSync('./downloads');
		}
		return './downloads/';
	}
};

(async (): Promise<void> => {
	const username = process.env.EMAIL;
	if (!username) {
		logger.error(
			'username is not present in .env.\nSet USERNAME in .env to root dir. \n e.g. \n echo USERNAME=${USERNAME} > .env',
		);
		return;
	}
	const password = getPassword(username);
	if (password instanceof Error) {
		logger.error(
			'password is not present in KeyChainAccess. Set service: RAKUTEN_CARD, Account: username, Password: password.',
		);
		return;
	}
	const browser = await puppeteer.launch({
		channel: 'chrome',
		headless: true,
	});
	const browserPage = await browser.newPage();
	const page = await login(browserPage, username, password);
	if (page instanceof Error) {
		logger.error(page.message);
		return;
	}
	const cardCount = await getCardCount(page);
	const baseDir = makeBaseDir();

	for (let index = 0; index < cardCount; index++) {
		if (index != 0) {
			await page.goto(TOP_URL, { waitUntil: 'load' });
			await page.evaluate(index => {
				(
					document.querySelector(
						'select[id="cardChangeForm:cardtype"]',
					) as HTMLSelectElement
				).selectedIndex = index;
				(document.getElementById('cardChangeForm') as HTMLFormElement).submit();
			}, index);
		}
		const cardName = await page.evaluate(
			(index: number) =>
				(
					document.querySelector(
						'select[id="cardChangeForm:cardtype"]',
					) as HTMLSelectElement
				).options[index].text,
			index,
		);
		logger.info(`Process is started. card name: ${cardName}`);

		const dir = baseDir + 'rakuten-card-' + index.toString();
		if (!existsSync(dir)) {
			mkdirSync(dir);
		}
		logger.info(`Some files will download to: ${dir}`);
		logger.info(`PDF download is started. card name: ${cardName}`);
		await clickLatestPdfUrl(page, dir);
		logger.info(`PDF download is ended. card name: ${cardName}`);

		logger.info(`CSV download is started. card name: ${cardName}`);
		await clickLatestCsvUrl(page, dir);
		logger.info(`CSV download is ended. card name: ${cardName}`);
		logger.info(`Process is ended. card name: ${cardName}`);
	}
	await browser.close();
})();
