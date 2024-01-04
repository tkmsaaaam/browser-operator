import puppeteer, { Page } from 'puppeteer-core';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { getLastDateDiff, saveLastDate } from './lastdate-repository';

type Disclosure = {
	datetime: string;
	code: string;
	name: string;
	title: string;
	url: string;
	market: string;
	update: string;
};

type Result = {
	favorites: Disclosure[];
	all: Disclosure[];
};

const makeLastDate = () => {
	const ARG_NAME = 'last';
	const LONG_ARG_KEY = ARG_NAME + '=';
	const SHORT_ARG_KEY = ARG_NAME.slice(0, 1) + '=';
	const longArgKeyAndValue = process.argv.find(
		arg => arg == LONG_ARG_KEY + 'true',
	);
	const shortArgKeyAndValue = process.argv.find(
		arg => arg == SHORT_ARG_KEY + 'true',
	);
	if (longArgKeyAndValue || shortArgKeyAndValue) {
		return getLastDateDiff();
	} else {
		return undefined;
	}
};

const makeArg = (argName: string) => {
	const LONG_ARG_KEY = argName + '=';
	const SHORT_ARG_KEY = argName.slice(0, 1) + '=';

	const longArgKeyAndValue = process.argv.find(arg =>
		arg.startsWith(LONG_ARG_KEY),
	);
	const shortArgKeyAndValue = process.argv.find(arg =>
		arg.startsWith(SHORT_ARG_KEY),
	);
	if (longArgKeyAndValue) {
		return longArgKeyAndValue.replace(LONG_ARG_KEY, '');
	} else if (shortArgKeyAndValue) {
		shortArgKeyAndValue.replace(SHORT_ARG_KEY, '');
	} else {
		return undefined;
	}
};

const makeStart = () => {
	const ARG_NAME = 'start';
	const startArg = makeArg(ARG_NAME);
	if (startArg) {
		return Number(startArg);
	} else {
		return undefined;
	}
};

const makeEnd = () => {
	const ARG_NAME = 'end';
	const endArg = makeArg(ARG_NAME);
	if (endArg) {
		return Number(endArg);
	} else {
		return 0;
	}
};

const makeDateDiff = () => {
	const ARG_NAME = 'diff';
	const diffArg = makeArg(ARG_NAME);
	if (diffArg) {
		return Number(diffArg);
	} else {
		return 0;
	}
};

const makeTargetDate = (diff: number) => {
	const currentDate = new Date();

	currentDate.setDate(currentDate.getDate() - diff);

	const year = currentDate.getFullYear();
	const month = currentDate.getMonth() + 1;
	const date = currentDate.getDate();

	return (
		year.toString() +
		month.toString().padStart(2, '0') +
		date.toString().padStart(2, '0')
	);
};

const sleep = (time: number) =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

const pushDisclosureList = async (page: Page): Promise<Disclosure[]> => {
	return await page.evaluate((list: Disclosure[]): Disclosure[] => {
		const table = document.getElementById('main-list-table');
		if (!table) return list;
		const data = table.getElementsByTagName('tr');
		const date = (
			document.getElementById('kaiji-date-1') as HTMLDivElement
		).innerText
			.replace(/年|月/g, '/')
			.replace('日', ' ');
		return Array.from(data).map(row => {
			return {
				datetime: date + row.getElementsByTagName('td')[0].innerText,
				code: row.getElementsByTagName('td')[1].innerText,
				name: row.getElementsByTagName('td')[2].innerText,
				title: row.getElementsByTagName('td')[3].innerText,
				url: row.getElementsByTagName('td')[3].getElementsByTagName('a')[0]
					.href,
				market: row.getElementsByTagName('td')[5].innerText,
				update: row.getElementsByTagName('td')[6].innerText,
			};
		});
	}, []);
};

const makePath = (i: number, dateStr: string) => {
	return 'I_list_' + i.toString().padStart(3, '0') + '_' + dateStr + '.html';
};

const getListFromADay = async (
	dateDiff: number,
	page: Page,
	disclosureList: Disclosure[],
) => {
	const BASE_URL = 'https://www.release.tdnet.info/inbs/';
	const targetDateStr = makeTargetDate(dateDiff);
	let pageSize = 0;

	for (let index = 1; index < pageSize + 2; index++) {
		const p = makePath(index, targetDateStr);
		await page.goto(BASE_URL + p);
		await sleep(3);
		if (index == 1) {
			pageSize = await page.evaluate((result_page_size: number): number => {
				result_page_size =
					document.getElementsByClassName('pager-M').length / 2;
				return result_page_size;
			}, pageSize);
		}
		const list = await pushDisclosureList(page);
		list.forEach(e => disclosureList.push(e));
	}
};

const makeTargetCodes = () => {
	const ARG_NAME = 'code';
	const LONG_ARG_KEY = ARG_NAME + '=';
	const SHORT_ARG_KEY = ARG_NAME.slice(0, 1) + '=';
	const argCodes: string[] = [];
	process.argv
		.filter(arg => arg.startsWith(LONG_ARG_KEY))
		.forEach(arg => argCodes.push(arg.replace(LONG_ARG_KEY, '')));
	process.argv
		.filter(arg => arg.startsWith(SHORT_ARG_KEY))
		.forEach(arg => argCodes.push(arg.replace(SHORT_ARG_KEY, '')));
	const file = path.resolve(__dirname, '../.env/favorite.txt');
	let codeStrs = '';
	Array.from(
		new Set(fs.readFileSync(file).toString().replace(/\s/g, '').split(',')),
	)
		.filter(code => !(code == ''))
		.sort((f, s) => {
			if (f < s) return -1;
			if (f > s) return 1;
			return 0;
		})
		.forEach(code => (codeStrs += code + ',\n'));

	fs.writeFileSync(file, codeStrs);

	const codes = codeStrs.toString().replace(/\s/g, '').split(',');
	argCodes.forEach(argCode => {
		if (argCode.includes('#')) {
			codes.push(argCode.slice(0, argCode.indexOf('#')));
		} else {
			codes.push(argCode);
		}
	});
	if (codes.length > 0) {
		return codes;
	} else {
		return undefined;
	}
};

const sortList = (list: Disclosure[]) => {
	return list.sort((f, s) => {
		if (f.datetime < s.datetime) return -1;
		if (f.datetime > s.datetime) return 1;
		if (f.code < s.code) return -1;
		if (f.code > s.code) return 1;
		return 0;
	});
};

(async () => {
	const browser = await puppeteer.launch({
		channel: 'chrome',
		headless: true,
	});
	const page = await browser.newPage();

	const disclosureList: Disclosure[] = [];

	const start = makeStart();
	const lastDate = makeLastDate();
	const end = makeEnd();
	if (start) {
		for (let i = start; i >= end; i--) {
			await getListFromADay(i, page, disclosureList);
		}
	} else if (lastDate) {
		for (let i = lastDate; i >= end; i--) {
			await getListFromADay(i, page, disclosureList);
		}
		saveLastDate(end);
	} else {
		const dateDiff = makeDateDiff();
		await getListFromADay(dateDiff, page, disclosureList);
	}
	await browser.close();

	const targetCodes = makeTargetCodes();
	const favoriteList: Disclosure[] = [];
	if (targetCodes) {
		targetCodes.forEach(targetCode =>
			disclosureList
				.filter(disclosure => disclosure.code == targetCode)
				.forEach(e => favoriteList.push(e)),
		);
	}

	const result: Result = {
		favorites: sortList(favoriteList),
		all: sortList(disclosureList),
	};

	if (process.env.FILE_OUTPUT == 'true') {
		fs.writeFile('./output.txt', JSON.stringify(result, null, 2), err => {
			if (err) {
				console.log(err);
			}
		});
	}

	console.log(util.inspect(result, { maxArrayLength: null }));
	console.log(
		'favorites: ' + result.favorites.length + ', all: ' + result.all.length,
	);
})();
