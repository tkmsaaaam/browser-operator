import { describe, test, jest, expect } from '@jest/globals';
import log4js from 'log4js';
import recording from 'log4js/lib/appenders/recording';
import { getPublishSoonList, getCurrent, main } from '../src';

describe('getPublishSoonList', () => {
	test('abnormalCase', async () => {
		const res = () =>
			Promise.resolve({
				ok: false,
				statusText: '404 Not Found',
			});
		global.fetch = jest.fn().mockImplementation(res);
		const result = await getPublishSoonList('THEATER');
		expect(result).toBeInstanceOf(Error);
		expect((result as Error).message).toBe(
			'HTTP Request is failed. url: https://www.unitedcinemas.jp/THEATER/movie.php status: 404 Not Found',
		);
	});
});

describe('getCurrent', () => {
	test('abnormalCase', async () => {
		const res = () =>
			Promise.resolve({
				ok: false,
				statusText: '404 Not Found',
			});
		global.fetch = jest.fn().mockImplementation(res);
		const result = await getCurrent('THEATER');
		expect(result).toBeInstanceOf(Error);
		expect((result as Error).message).toBe(
			'HTTP Request is failed. url: https://www.unitedcinemas.jp/THEATER/film.php status: 404 Not Found',
		);
	});
});

describe('main', () => {
	test('THEATER is not present.', async () => {
		log4js.configure({
			appenders: {
				out: { type: 'recording' },
			},
			categories: {
				default: { appenders: ['out'], level: 'all' },
			},
		});
		recording.erase();
		await main();
		expect(recording.replay()[0].data[0]).toBe(
			'The THEATER is not designated. https://www.unitedcinemas.jp/index.html',
		);
	});
});
