import puppeteer, { Page } from 'puppeteer-core';
import util from 'util';

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

const makeDateDiff = (): number => {
	for (let index = 0; index < process.argv.length; index++) {
		if (process.argv[index].startsWith('diff=')) {
			return Number(process.argv[index].replace('diff=', ''));
		} else if (process.argv[index].startsWith('d=')) {
			return Number(process.argv[index].replace('d=', ''));
		}
	}
	return 0;
};

const makeTargetDate = (diff: number): string => {
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

const sleep = (time: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

const pushDisclosureList = async (
	page: Page,
	disclosureList: Disclosure[]
): Promise<Disclosure[]> => {
	return await page.evaluate((list: Disclosure[]): Disclosure[] => {
		const table = document.getElementById('main-list-table');
		if (!table) return list;
		const data = table.getElementsByTagName('tr');
		const date = (
			document.getElementById('kaiji-date-1') as HTMLDivElement
		).innerText
			.replace(/年|月/g, '/')
			.replace('日', ' ');
		for (let index = 0; index < data.length; index++) {
			const row = data[index];
			const disclosure: Disclosure = {
				datetime: date + row.getElementsByTagName('td')[0].innerText,
				code: row.getElementsByTagName('td')[1].innerText,
				name: row.getElementsByTagName('td')[2].innerText,
				title: row.getElementsByTagName('td')[3].innerText,
				url: row.getElementsByTagName('td')[3].getElementsByTagName('a')[0]
					.href,
				market: row.getElementsByTagName('td')[5].innerText,
				update: row.getElementsByTagName('td')[6].innerText,
			};
			list.push(disclosure);
		}
		return list;
	}, disclosureList);
};

const makeTargetCode = (): undefined | string => {
	for (let index = 0; index < process.argv.length; index++) {
		if (process.argv[index].startsWith('code=')) {
			return process.argv[index].replace('code=', '');
		} else if (process.argv[index].startsWith('c=')) {
			return process.argv[index].replace('c=', '');
		}
	}
	return undefined;
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

const makePath = (i: number, date: string) => {
	return 'I_list_' + i.toString().padStart(3, '0') + '_' + date + '.html';
};

(async () => {
	const BASE_URL = 'https://www.release.tdnet.info/inbs/';

	const browser = await puppeteer.launch({
		channel: 'chrome',
		headless: true,
	});
	const page = await browser.newPage();

	const disclosureList = [];

	const dateDiff = makeDateDiff();
	const targetDate = makeTargetDate(dateDiff);
	let page_size = 0;

	for (let index = 1; index < page_size + 2; index++) {
		const p = makePath(index, targetDate);
		await page.goto(BASE_URL + p);
		await sleep(3);
		if (index == 1) {
			page_size = await page.evaluate((result_page_size: number): number => {
				result_page_size =
					document.getElementsByClassName('pager-M').length / 2;
				return result_page_size;
			}, 1);
		}

		const l = await pushDisclosureList(page, []);
		for (let i = 0; i < l.length; i++) {
			const element = l[i];
			disclosureList.push(element);
		}
	}

	const targetCode = makeTargetCode();
	const favoriteList = [];
	if (targetCode) {
		for (let i = 0; i < disclosureList.length; i++) {
			const e = disclosureList[i];
			if (e.code == targetCode) {
				favoriteList.push(e);
			}
		}
	}

	const result: Result = {
		favorites: sortList(favoriteList),
		all: sortList(disclosureList),
	};

	console.log(util.inspect(result, { maxArrayLength: null }));
	console.log(
		'favorites: ' + result.favorites.length + ', all: ' + result.all.length
	);
	await browser.close();
})();
