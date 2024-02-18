import { JSDOM } from 'jsdom';

(async () => {
	const theater = process.env.THEATER;
	if (!theater) {
		console.error(
			'The theater is not designated. https://www.unitedcinemas.jp/index.html',
		);
		return;
	}

	const url = 'https://www.unitedcinemas.jp/' + theater + '/movie.php';
	const res = await fetch(url);
	const buf = await res.arrayBuffer();
	const strhtml = new TextDecoder('shift-jis').decode(buf);

	const jsdom = new JSDOM();
	const parser = new jsdom.window.DOMParser();
	const doc = parser.parseFromString(strhtml, 'text/html');

	const movieList = doc
		.getElementsByClassName('movieList')[0]
		.getElementsByTagName('li');

	for (const movie of movieList) {
		const id = movie.id;
		if (!id) {
			continue;
		}

		const em = movie.getElementsByTagName('em')[0];
		const dateStr = em.textContent?.substring(0, 10);

		const a = movie.getElementsByTagName('a')[0];
		const url = 'https://www.unitedcinemas.jp' + a.href;

		const title = a.textContent;

		console.log('url: %s, 公開日: %s, タイトル: %s', url, dateStr, title);
	}
})();
