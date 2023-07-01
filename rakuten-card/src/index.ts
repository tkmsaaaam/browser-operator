import puppeteer, { Page } from 'puppeteer-core';
import * as dotenv from 'dotenv';
dotenv.config();

const LOGIN_URL = 'https://www.rakuten-card.co.jp/e-navi/index.xhtml';
const DOWNLOAD_LIST_URL =
	'https://www.rakuten-card.co.jp/e-navi/members/statement/download-list.xhtml';

const sleep = (time: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

const INTERVAL = 10;

const clickLatestUrl = async (page: Page): Promise<void> => {
	await page.click(
		'a[href="/e-navi/members/statement/download-list.xhtml?downloadAsPdf=0"]'
	);
};

const getCardCount = async (page: Page) => {
	return await page.evaluate(() => {
		const i = (
			document.querySelector(
				'select[id="cardChangeForm:card"]'
			) as HTMLSelectElement
		).options.length;
		console.log(i);
		return i;
	});
};

(async (): Promise<void> => {
	if (!process.env.EMAIL || !process.env.PASSWORD) return;
	const browser = await puppeteer.launch({
		channel: 'chrome',
		headless: false,
	});
	const page = await browser.newPage();
	await page.goto(LOGIN_URL);
	await page.type('input[id="u"]', process.env.EMAIL);
	await page.type('input[id="p"]', process.env.PASSWORD);
	await page.click('input[id="loginButton"]');
	await sleep(INTERVAL);
	await page.goto(DOWNLOAD_LIST_URL);
	await sleep(INTERVAL);
	clickLatestUrl(page);
	await sleep(INTERVAL);

	const cardCount = await getCardCount(page);
	for (let index = 1; index < cardCount; index++) {
		await page.evaluate(index => {
			const e: HTMLSelectElement | null = document.querySelector(
				'select[id="cardChangeForm:card"]'
			);
			if (e) {
				e.selectedIndex = index;
			}

			const form: HTMLElement | null =
				document.getElementById('cardChangeForm');
			if (form) {
				(form as HTMLFormElement).submit();
			}
		}, index);
		await sleep(INTERVAL);
		clickLatestUrl(page);
		await sleep(INTERVAL);
	}
	await sleep(INTERVAL);
	await browser.close();
})();
