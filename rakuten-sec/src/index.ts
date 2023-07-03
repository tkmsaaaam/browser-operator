import puppeteer from 'puppeteer-core';
import * as dotenv from 'dotenv';
dotenv.config();

type Total = {
	amount: string;
	diff: string;
};

type Possess = {
	securityType: string;
	name: string;
	accountType: string;
	count: string;
	buyPrice: string;
	currentPrice: string;
	lastDayDiff: string;
	totalAmount: string;
	totalDiff: string;
};

type Result = {
	total: Total;
	possessList: Possess[];
};

const LOGIN_URL = 'https://www.rakuten-sec.co.jp/';
const ALL_ASSET_LIST_URL =
	'https://member.rakuten-sec.co.jp/app/ass_all_possess_lst.do;';

const INTERVAL = 10;

const sleep = (time: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

(async () => {
	if (!process.env.USERNAME || !process.env.PASSWORD) return;
	const browser = await puppeteer.launch({
		channel: 'chrome',
		headless: true,
	});
	const page = await browser.newPage();
	await page.goto(LOGIN_URL);
	await page.type('input[id="form-login-id"]', process.env.USERNAME);
	await page.type('input[id="form-login-pass"]', process.env.PASSWORD);
	await page.click('button[id="login-btn"]');
	await sleep(INTERVAL);
	const bvSessionId = page.url().split(';')[1].split('?')[0];
	await page.goto(
		ALL_ASSET_LIST_URL +
			bvSessionId +
			'?eventType=directInit&l-id=mem_pc_top_all-possess-lst&gmn=H&smn=01&lmn=&fmn='
	);

	await sleep(INTERVAL);

	const result: Result = { total: { amount: '0', diff: '0' }, possessList: [] };

	const r = await page.evaluate((res: Result) => {
		const totalAmount = document.querySelector(
			'td[class="R1 B3 f105p"] span[class="fb"]'
		);
		if (totalAmount)
			res.total.amount = (totalAmount as HTMLSpanElement).innerText;
		const totalAmountDiff = document.querySelector('span[class="PLY"]');
		if (totalAmountDiff)
			res.total.diff = (totalAmountDiff as HTMLSpanElement).innerText;

		const tableProcessData = document.getElementById('table_possess_data');
		if (!tableProcessData) return;
		const possessList = tableProcessData.getElementsByTagName('tr');
		if (!possessList) return;
		const possessCount = possessList.length;
		for (let index = 3; index < possessCount; index++) {
			const possessRaw = possessList[index];
			const dataRaw = possessRaw.getElementsByTagName('td');
			const securityType = dataRaw[0].innerText;
			if (securityType == '米国株式') {
				const possess: Possess = {
					securityType: dataRaw[0].innerText,
					name: dataRaw[1].innerText,
					accountType: dataRaw[3].innerText,
					count: dataRaw[4].innerText,
					buyPrice: dataRaw[5].innerText,
					currentPrice: dataRaw[6].getElementsByTagName('div')[0].innerText,
					lastDayDiff: dataRaw[6].getElementsByTagName('div')[1].innerText,
					totalAmount: dataRaw[7].getElementsByTagName('div')[0].innerText,
					totalDiff: dataRaw[7]
						.getElementsByTagName('div')[2]
						.innerText.replace('\t', '')
						.replace('\n', ''),
				};
				res.possessList.push(possess);
			} else {
				const possess: Possess = {
					securityType: dataRaw[0].innerText,
					name: dataRaw[1].innerText,
					accountType: dataRaw[2].innerText.replace('\n', ''),
					count: dataRaw[3].innerText,
					buyPrice: dataRaw[4].innerText,
					currentPrice: dataRaw[5].getElementsByTagName('div')[0].innerText,
					lastDayDiff: dataRaw[5].getElementsByTagName('div')[1].innerText,
					totalAmount: dataRaw[6].getElementsByTagName('div')[0].innerText,
					totalDiff: dataRaw[6]
						.getElementsByTagName('div')[2]
						.innerText.replace('\t', '')
						.replace('\n', ''),
				};
				res.possessList.push(possess);
			}
		}

		return res;
	}, result);
	console.log(r);
	await browser.close();
})();
