import { JSDOM } from 'jsdom';
import fs from 'fs';
import log4js from 'log4js';

const BASE_URL = 'https://kanpou.npb.go.jp';

const logger = log4js.getLogger();
logger.level = 'all';

const getDom = async (url: string) => {
	logger.info(`fetch starts. url: ${url}`);
	const res = await fetch(url);
	logger.info(`fetch ends. url: ${url}`);
	if (!res.ok) {
		return new Error(
			`Can not get dom. HTTP request is failed. res status: ${res.statusText}`,
		);
	}
	const strhtml = await res.text();

	const jsdom = new JSDOM();
	const parser = new jsdom.window.DOMParser();
	return parser.parseFromString(strhtml, 'text/html');
};

export const makeFileName = (path: string) => {
	if (path.startsWith('./')) {
		path = path.substring(1);
	} else if (!path.startsWith('/')) {
		path = '/' + path;
	}

	const fileName = path.split('/').pop();
	if (!fileName) {
		return new Error(`Can not get fileName. path: ${path}`);
	}
	if (!fileName.endsWith('.pdf')) {
		return new Error(`Can not make pdf path. fileName: ${fileName}`);
	}
	return fileName;
};

const downloadFile = async (
	path: string,
	fileName: string,
): Promise<Error | undefined> => {
	if (!fs.existsSync('./downloads')) {
		fs.mkdirSync('./downloads');
	}

	if (fs.existsSync('./downloads/' + fileName)) {
		return new Error('The gazette was already downloaded.');
	}

	const res = await fetch(BASE_URL + path);
	if (!res.ok) {
		return new Error(`Can not get pdf. url: ${BASE_URL + path}`);
	}

	const arrayBuffer = await res.arrayBuffer();

	const buffer = Buffer.from(arrayBuffer);
	fs.writeFileSync('./downloads/' + fileName, buffer);
	logger.log('Downloaded: ' + fileName);
	return;
};

const main = async () => {
	const doc = await getDom(BASE_URL);
	if (doc instanceof Error) {
		logger.error(doc.message);
		return;
	}
	const dlList = doc.getElementsByTagName('dl');

	for (let index = 1; index < dlList.length; index++) {
		const dl = dlList[index];

		const liList = dl.getElementsByTagName('li');
		if (liList.length < 2) {
			logger.error('HTML was changed. The list is not present.');
			break;
		}
		const li = liList[1];
		const aList = li.getElementsByTagName('a');
		if (aList.length < 2) {
			logger.error('HTML was changed. An element for download is present.');
			break;
		}
		const href = aList[1].href;
		if (href == '') break;
		const fileName = makeFileName(href);
		if (fileName instanceof Error) {
			logger.error(`Can not make file name. error: ${fileName.message}`);
			break;
		}
		const res = await downloadFile(href, fileName);
		if (res instanceof Error) {
			logger.error(`Can not download file. error: ${res.message}`);
			break;
		}
	}
};
if (process.env.NODE_ENV != 'test') {
	main();
}
