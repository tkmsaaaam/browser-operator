import puppeteer, { Page } from 'puppeteer-core';
import * as dotenv from 'dotenv';
dotenv.config();
import { getPassword } from './authentication';
import { existsSync, mkdirSync } from 'fs';

const LOGIN_URL = 'https://www.rakuten-card.co.jp/e-navi/index.xhtml';
const TOP_URL = 'https://www.rakuten-card.co.jp/e-navi/members/index.xhtml';
const DOWNLOAD_LIST_URL =
	'https://www.rakuten-card.co.jp/e-navi/members/statement/download-list.xhtml';

const DOWNLOAD_CSV_URL =
	'https://www.rakuten-card.co.jp/e-navi/members/statement/index.xhtml?tabNo=1';

const sleep = (time: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

const INTERVAL = 10;

const clickLatestPdfUrl = async (page: Page, dir: string): Promise<void> => {
	await downloadFile(
		page,
		dir,
		'a[href="/e-navi/members/statement/download-list.xhtml?downloadAsPdf=0"]',
	);
};

const clickLatestCsvUrl = async (page: Page, dir: string): Promise<void> => {
	await downloadFile(
		page,
		dir,
		'a[href="/e-navi/members/statement/index.xhtml?downloadAsCsv=1"]',
	);
};

const downloadFile = async (page: Page, dir: string, element: string) => {
	const client = await page.target().createCDPSession();
	client.send('Page.setDownloadBehavior', {
		behavior: 'allow',
		downloadPath: dir,
	});
	await page.click(element);
};

const getCardCount = async (page: Page) => {
	return await page.evaluate(() => {
		return (
			document.querySelector(
				'select[id="cardChangeForm:cardtype"]',
			) as HTMLSelectElement
		).options.length;
	});
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
		return './';
	}
};

(async (): Promise<void> => {
	const username = process.env.EMAIL;
	if (!username) {
		console.error(
			'username is not present in .env.\nSet USERNAME in .env to root dir. \n e.g. \n echo USERNAME=${USERNAME} > .env',
		);
		return;
	}
	const password = getPassword(username);
	if (!password) {
		console.error(
			'password is not present in KeyChainAccess. Set service: RAKUTEN_CARD, Account: username, Password: password.',
		);
		return;
	}
	const browser = await puppeteer.launch({
		channel: 'chrome',
		headless: true,
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
	const baseDir = makeBaseDir();

	for (let index = 0; index < cardCount; index++) {
		if (index != 0) {
			await page.goto(TOP_URL);
			await sleep(INTERVAL);
			await page.evaluate(index => {
				(
					document.querySelector(
						'select[id="cardChangeForm:cardtype"]',
					) as HTMLSelectElement
				).selectedIndex = index;
				(document.getElementById('cardChangeForm') as HTMLFormElement).submit();
			}, index);
			await sleep(INTERVAL);
		}

		await page.goto(DOWNLOAD_LIST_URL);
		await sleep(INTERVAL);
		const dir = baseDir + 'rakuten-card-' + index.toString();
		mkdirSync(dir);
		await clickLatestPdfUrl(page, dir);
		await sleep(INTERVAL);

		await page.goto(DOWNLOAD_CSV_URL);
		await sleep(INTERVAL);
		await clickLatestCsvUrl(page, dir);
		await sleep(INTERVAL);
	}
	await sleep(INTERVAL);
	await browser.close();
})();
