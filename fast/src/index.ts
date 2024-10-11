import puppeteer, { Browser, Page } from 'puppeteer-core';
import log4js from 'log4js';

const logger = log4js.getLogger();
logger.level = 'all';

type Result = {
	count: number;
	sum: number;
};

const sleep = (time: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

const main = async () => {
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
	await Promise.all([
		page.goto('https://fast.com/ja/'),
		page.waitForNavigation({
			waitUntil: ['load', 'networkidle2'],
			timeout: 300000,
		}),
		sleep(1),
	]);
	logger.info('started');

	const res = await makeResult(page);

	if (!res) {
		logger.error('Can not get value');
	} else {
		logger.info(`tried ${res.count} times. avg: ${res.sum / res.count} Mbps`);
	}
	await browser.close();
};

type Speed = {
	value: string | undefined;
	unit: string | undefined;
};

const getSpeed = async (page: Page): Promise<Speed> => {
	await Promise.all([
		page.reload(),
		page.waitForNavigation({
			waitUntil: ['load', 'networkidle2'],
			timeout: 300000,
		}),
		sleep(3),
	]);
	const speed: Speed = {
		value: undefined,
		unit: undefined,
	};
	return await page.evaluate((s: Speed) => {
		s.value = document.getElementById('speed-value')?.innerText;
		s.unit = document.getElementById('speed-units')?.innerText;
		return s;
	}, speed);
};

const makeResult = async (page: Page): Promise<Result | undefined> => {
	let sum = 0;
	let i = 0;
	let b = false;
	for (let j = 0; j < 5; j++) {
		logger.info(`getting...(${j + 1})`);
		const v = await getSpeed(page);
		if (v.value == '0') {
			logger.error(`Can not get speed. ${j + 1}`);
			if (!b) {
				b = true;
				continue;
			}
			if (j == 1) {
				// 二回連続なのでundefinedで終了
				return;
			}
			const res: Result = {
				count: i,
				sum: sum,
			};
			return res;
		} else {
			logger.info(`speed: ${v.value} ${v.unit} (${j + 1})`);
			i++;
			let k = 0;
			if (v.unit == 'Gbps') {
				k = Number(v.value) * 1000;
			} else if (v.unit == 'Mbps') {
				k = Number(v.value);
			} else if (v.unit == 'Kbps') {
				k = Number(v.value) / 1000;
			} else {
				k = 0;
				i--;
			}
			sum = sum + k;
		}
	}
	const res: Result = {
		count: i,
		sum: sum,
	};
	return res;
};

if (process.env.NODE_ENV != 'test') {
	main();
}
