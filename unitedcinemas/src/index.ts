import { JSDOM } from 'jsdom';
import log4js from 'log4js';

type Movie = {
	url: string;
	dateStr: string | null;
	title: string | null;
};

const logger = log4js.getLogger();
logger.level = 'all';

const jsdom = new JSDOM();
const parser = new jsdom.window.DOMParser();

(async () => {
	const theater = process.env.THEATER;
	if (!theater) {
		logger.error(
			'The theater is not designated. https://www.unitedcinemas.jp/index.html',
		);
		return;
	}

	const url = 'https://www.unitedcinemas.jp/' + theater + '/movie.php';
	const res = await fetch(url);
  if (!res.ok) {
    logger.error(`HTTP Request is failed. url: ${url} status: ${res.statusText}`)
    return
  }
	const buf = await res.arrayBuffer();
	const strhtml = new TextDecoder('shift-jis').decode(buf);

	const doc = parser.parseFromString(strhtml, 'text/html');

	const movieList = doc
		.getElementsByClassName('movieList')[0]
		.getElementsByTagName('li');

	const result: Movie[] = Array.from(movieList)
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
	console.log('%o', result);
})();
