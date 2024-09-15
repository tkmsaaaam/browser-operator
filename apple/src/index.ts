import { JSDOM } from 'jsdom';
import log4js from 'log4js';

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
	const strhtml = await res.text();

	return parser.parseFromString(strhtml, 'text/html');
};

export const main = async () => {
	const url = 'https://www.apple.com/jp/shop/refurbished/iphone';
	const doc = await getDom(url);
	if (doc instanceof Error) {
		return new Error(`Can not get publish soon list. ${doc.message}`);
	}
	const results = doc.getElementsByClassName('rf-refurb-category-grid-no-js');
	const products = results[0].getElementsByTagName('li');
	const res = Array.from(products)
		.map(product => {
			const e = product.getElementsByTagName('h3')[0];
			const url = e.getElementsByTagName('a')[0].href;
			const name = e.textContent?.trim();
			const price = product
				.getElementsByTagName('div')[0]
				.textContent?.replace(/[^0-9]/g, '')
				.trim();
			return {
				name: name,
				url: 'https://www.apple.com' + url,
				price: price,
			};
		})
		.sort((f, s) => {
			if (!s.price) return -1;
			if (!f.price) return 1;
			if (f.price < s.price) return -1;
			if (f.price > s.price) return 1;
			return 0;
		});
	const fileLogger = log4js.getLogger('file');
	fileLogger.info(JSON.stringify(res, null, 2));
	logger.info(JSON.stringify(res, null, 2));
};
if (process.env.NODE_ENV != 'test') {
	main();
}
