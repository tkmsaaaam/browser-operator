import { JSDOM } from 'jsdom';
import fs from 'fs';

const BASE_URL = 'https://kanpou.npb.go.jp';

const getDom = async (url: string) => {
	const res = await fetch(url);
	const strhtml = await res.text();

	const jsdom = new JSDOM();
	const parser = new jsdom.window.DOMParser();
	return parser.parseFromString(strhtml, 'text/html');
};

const downloadFile = async (path: string): Promise<boolean> => {
	if (path.startsWith('./')) {
		path = path.substring(1);
	} else if (!path.startsWith('/')) {
		path = '/' + path;
	}

	const fileName = path.split('/').pop();
	if (!fileName?.endsWith('.pdf')) {
		return false;
	}

	if (!fs.existsSync('./downloads')) {
		fs.mkdirSync('./downloads');
	}

	if (fs.existsSync('./downloads/' + fileName)) {
		console.warn('The gazette was already downloaded.');
		return false;
	}

	const res = await fetch(BASE_URL + path);

	const arrayBuffer = await res.arrayBuffer();

	const buffer = Buffer.from(arrayBuffer);
	fs.writeFileSync('./downloads/' + fileName, buffer);
	console.log('Downloaded: ' + fileName);
	return true;
};

const main = async () => {
	const doc = await getDom(BASE_URL);
	const dlList = doc.getElementsByTagName('dl');

	for (let index = 1; index < dlList.length; index++) {
		const dl = dlList[index];

		const liList = dl.getElementsByTagName('li');
		if (liList.length < 2) {
			console.error("HTML was changed. Today's list is not present.");
			return;
		}
		const li = liList[1];
		const aList = li.getElementsByTagName('a');
		if (aList.length < 2) {
			console.error('HTML was changed. An element for download is present.');
			break;
		}
		const href = aList[1].href;
		if (!href) break;
		const res = await downloadFile(href);
		if (!res) break;
	}
};
main();
