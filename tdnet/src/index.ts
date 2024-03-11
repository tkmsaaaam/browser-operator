import util from 'util';
import fs from 'fs';
import {
	getFavoriteList,
	getLastDateDiff,
	saveFavoriteList,
	saveLastDate,
} from './file-repository';
import { getDom } from './http-client';

export type Disclosure = {
	datetime: string;
	code: string | undefined;
	name: string | undefined;
	title: string | undefined;
	url: string;
	market: string | undefined;
	update: string | undefined;
};

type Result = {
	favorites: Disclosure[];
	all: Disclosure[];
};

export const makeLastDate = () => {
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

export const makeArg = (argName: string) => {
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
		return shortArgKeyAndValue.replace(SHORT_ARG_KEY, '');
	} else {
		return undefined;
	}
};

export const makeStart = () => {
	const ARG_NAME = 'start';
	const startArg = makeArg(ARG_NAME);
	if (startArg) {
		return Number(startArg);
	} else {
		return undefined;
	}
};

export const makeEnd = () => {
	const ARG_NAME = 'end';
	const endArg = makeArg(ARG_NAME);
	if (endArg) {
		return Number(endArg);
	} else {
		return 0;
	}
};

export const makeDateDiff = () => {
	const ARG_NAME = 'diff';
	const diffArg = makeArg(ARG_NAME);
	if (diffArg) {
		return Number(diffArg);
	} else {
		return 0;
	}
};

export const makeTargetDate = (diff: number) => {
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

const BASE_URL = 'https://www.release.tdnet.info/inbs/';

export const convertFromDocToList = (doc: Document): Disclosure[] => {
	const table = doc.getElementById('main-list-table');
	if (!table) return [];
	const data = table.getElementsByTagName('tr');

	const dateStr = (doc.getElementById('kaiji-date-1') as HTMLDivElement)
		.textContent;

	if (!dateStr) return [];

	const date = dateStr.replace(/年|月/g, '/').replace('日', ' ');
	return Array.from(data).map(row => {
		return {
			datetime: date + row.getElementsByTagName('td')[0].textContent?.trim(),
			code: row.getElementsByTagName('td')[1].textContent?.trim(),
			name: row.getElementsByTagName('td')[2].textContent?.trim(),
			title: row.getElementsByTagName('td')[3].textContent?.trim(),
			url:
				BASE_URL +
				row.getElementsByTagName('td')[3].getElementsByTagName('a')[0].href,
			market: row.getElementsByTagName('td')[5].textContent?.trim(),
			update: row.getElementsByTagName('td')[6].textContent?.trim(),
		};
	});
};

export const makePath = (i: number, dateStr: string) => {
	return 'I_list_' + i.toString().padStart(3, '0') + '_' + dateStr + '.html';
};

const getListFromADay = async (dateDiff: number): Promise<Disclosure[]> => {
	const targetDateStr = makeTargetDate(dateDiff);
	let pageSize = 0;
	const list: Disclosure[] = [];

	for (let index = 1; index < pageSize + 2; index++) {
		const p = makePath(index, targetDateStr);
		const doc = await getDom(BASE_URL + p);
		if (!doc) {
			continue;
		}
		if (index == 1) {
			pageSize = doc.getElementsByClassName('pager-M').length / 2;
		}
		convertFromDocToList(doc).forEach(e => list.push(e));
	}
	return list;
};

export const makeTargetCodes = () => {
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
	const codes = getFavoriteList();
	argCodes.forEach(argCode => {
		codes.push(argCode);
	});
	saveFavoriteList(codes);

	if (codes.length > 0) {
		return codes;
	} else {
		return undefined;
	}
};

export const sortList = (list: Disclosure[]) => {
	return list.sort((f, s) => {
		if (f.datetime < s.datetime) return -1;
		if (f.datetime > s.datetime) return 1;
		if (f.code && s.code && f.code < s.code) return -1;
		if (f.code && s.code && f.code > s.code) return 1;
		return 0;
	});
};

export const main = async () => {
	const disclosureList: Disclosure[] = [];

	const start = makeStart();
	const lastDate = makeLastDate();
	const end = makeEnd();
	if (start) {
		for (let i = start; i >= end; i--) {
			const list = await getListFromADay(i);
			list.forEach(e => disclosureList.push(e));
		}
	} else if (lastDate) {
		for (let i = lastDate; i >= end; i--) {
			const list = await getListFromADay(i);
			list.forEach(e => disclosureList.push(e));
		}
		saveLastDate(end);
	} else {
		const dateDiff = makeDateDiff();
		const list = await getListFromADay(dateDiff);
		list.forEach(e => disclosureList.push(e));
	}

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
};

if (process.env.NODE_ENV != 'test') {
	main();
}
