import puppeteer, { Page } from 'puppeteer-core';
import * as dotenv from 'dotenv';
dotenv.config();
import { getPassword } from './authentication';

const LOGIN_URL = 'https://www.rakuten-card.co.jp/e-navi/index.xhtml';
const TOP_URL = 'https://www.rakuten-card.co.jp/e-navi/members/index.xhtml';
const DOWNLOAD_LIST_URL =
	'https://www.rakuten-card.co.jp/e-navi/members/statement/download-list.xhtml';

const DOWNLOAD_CSV_URL =
	'https://www.rakuten-card.co.jp/e-navi/members/statement/index.xhtml?tabNo=1';

const sleep = (time: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

const INTERVAL = 10;

const clickLatestPdfUrl = async (page: Page): Promise<void> => {
	await page.click(
		'a[href="/e-navi/members/statement/download-list.xhtml?downloadAsPdf=0"]'
	);
};

const clickLatestCsvUrl = async (page: Page): Promise<void> => {
	await page.click(
		'a[href="/e-navi/members/statement/index.xhtml?downloadAsCsv=1"]'
	);
};

const getCardCount = async (page: Page) => {
	return await page.evaluate(() => {
		return (
			document.querySelector(
				'select[id="cardChangeForm:cardtype"]'
			) as HTMLSelectElement
		).options.length;
	});
};

(async (): Promise<void> => {
	const username = process.env.EMAIL;
	if (!username) {
		console.error(
			'username is not present in .env.\nSet USERNAME in .env to root dir. \n e.g. \n echo USERNAME=${USERNAME} > .env'
		);
		return;
	}
	const password = getPassword(username);
	if (!password) {
		console.error(
			'password is not present in KeyChainAccess. Set service: RAKUTEN_CARD, Account: username, Password: password.'
		);
		return;
	}
	const browser = await puppeteer.launch({
		channel: 'chrome',
		headless: false,
	});
	const page = await browser.newPage();
	await page.goto(LOGIN_URL);
	await page.type('input[id="u"]', username);
	await page.type('input[id="p"]', password);
	await page.click('input[id="loginButton"]');
	await sleep(INTERVAL);
	await page.goto(TOP_URL);
	await sleep(INTERVAL);
	const cardCount = await getCardCount(page);
	for (let index = 0; index < cardCount; index++) {
		if (index != 0) {
			await page.goto(TOP_URL);
			await sleep(INTERVAL);
			await page.evaluate(index => {
				(
					document.querySelector(
						'select[id="cardChangeForm:cardtype"]'
					) as HTMLSelectElement
				).selectedIndex = index;
				(document.getElementById('cardChangeForm') as HTMLFormElement).submit();
			}, index);
			await sleep(INTERVAL);
		}

		await page.goto(DOWNLOAD_LIST_URL);
		await sleep(INTERVAL);
		await clickLatestPdfUrl(page);
		await sleep(INTERVAL);

		await page.goto(DOWNLOAD_CSV_URL);
		await sleep(INTERVAL);
		await clickLatestCsvUrl(page);
		await sleep(INTERVAL);
	}
	await sleep(INTERVAL);
	await browser.close();
})();
