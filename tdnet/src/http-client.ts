import { JSDOM } from 'jsdom';
export const getDom = async (url: string): Promise<Document> => {
	const res = await fetch(url);
	const strhtml = await res.text();

	const jsdom = new JSDOM();
	const parser = new jsdom.window.DOMParser();
	return parser.parseFromString(strhtml, 'text/html');
};
