import { JSDOM } from 'jsdom';
import log4js from 'log4js';

type Movie = {
	url: string;
	dateStr: string | null;
	title: string | null;
};

type Result = {
	finishSoon: Movie[];
	current: Movie[];
	publishSoon: Movie[];
};

const logger = log4js.getLogger();
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

const jsdom = new JSDOM();
const parser = new jsdom.window.DOMParser();
global.DOMParser = jsdom.window.DOMParser;
global.Document = jsdom.window.Document;

export const getDom = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) {
		return new Error(
			`HTTP Request is failed. url: ${url} status: ${res.statusText}`,
		);
	}
	const buf = await res.arrayBuffer();
	const strhtml = new TextDecoder('shift-jis').decode(buf);

	return parser.parseFromString(strhtml, 'text/html');
};

export const getPublishSoonList = async (theater: string) => {
	const url = 'https://www.unitedcinemas.jp/' + theater + '/movie.php';
	const doc = await getDom(url);
	if (doc instanceof Error) {
		return new Error(`Can not get publish soon list. ${doc.message}`);
	}

	const movieListElements = doc.getElementsByClassName('movieList');

	if (movieListElements.length < 1) {
		return new Error('HTML is changed.');
	}

	const movieList = movieListElements[0].getElementsByTagName('li');

	return Array.from(movieList)
		.filter(movie => movie.id)
		.map(movie => {
			const em = movie.getElementsByTagName('em')[0];
			let dateStr: string | null;
			if (em.textContent) {
				const start = em.textContent.indexOf('202');
				if (start != -1) {
					dateStr = em.textContent.substring(start, start + 10);
				} else {
					dateStr = null;
				}
			} else {
				dateStr = null;
			}

			const a = movie.getElementsByTagName('a')[0];
			return {
				url: 'https://www.unitedcinemas.jp' + a.href,
				dateStr: dateStr,
				title: a.textContent,
			};
		});
};

export const getCurrent = async (theater: string) => {
	const url = 'https://www.unitedcinemas.jp/' + theater + '/film.php';
	const doc = await getDom(url);
	if (doc instanceof Error) {
		return new Error(`Can not get current list. ${doc.message}`);
	}

	const movieList = doc.getElementsByClassName('movieList');

	if (movieList.length < 1) {
		return new Error('HTML is changed.');
	}

	const currentList = movieList[0].getElementsByClassName('movieHead');

	const current = Array.from(currentList).map(movie => {
		const emList = movie.getElementsByTagName('em');
		let dateStr: string | null;
		if (emList.length > 0 && emList[0].textContent) {
			const start = emList[0].textContent.indexOf('202');
			if (start != -1) {
				dateStr = emList[0].textContent.substring(start, start + 10);
			} else {
				dateStr = null;
			}
		} else {
			dateStr = null;
		}
		const a = movie.getElementsByTagName('a')[0];
		return {
			url: 'https://www.unitedcinemas.jp' + a.href,
			dateStr: dateStr,
			title: a.textContent,
		};
	});

	if (movieList.length <= 1) {
		return { current, finishSoon: [] };
	}

	const finishSoonList = movieList[1].getElementsByClassName('movieHead');

	const finishSoon = Array.from(finishSoonList).map(movie => {
		const a = movie.getElementsByTagName('a')[0];
		return {
			url: 'https://www.unitedcinemas.jp' + a.href,
			dateStr: null,
			title: a.textContent,
		};
	});
	return { current, finishSoon };
};

export const main = async () => {
	const theater = process.env.THEATER;
	if (!theater) {
		logger.error(
			'The THEATER is not designated. https://www.unitedcinemas.jp/index.html',
		);
		return;
	}

	const publishSoon = await getPublishSoonList(theater);
	if (publishSoon instanceof Error) {
		logger.error(publishSoon.message);
		return;
	}
	const current = await getCurrent(theater);
	if (current instanceof Error) {
		logger.error(current.message);
		return;
	}
	const result: Result = {
		finishSoon: current.finishSoon,
		current: current.current,
		publishSoon: publishSoon,
	};

	const fileLogger = log4js.getLogger('file');
	fileLogger.info(JSON.stringify(result, null, 2));
};

if (process.env.NODE_ENV != 'test') {
	main();
}
