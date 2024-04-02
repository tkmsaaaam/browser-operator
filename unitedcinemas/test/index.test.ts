import { describe, test, jest, expect } from '@jest/globals';
import log4js from 'log4js';
import recording from 'log4js/lib/appenders/recording';
import { getPublishSoonList, getCurrent, main, getDom } from '../src';

describe('getDom', () => {
	test('normalCases', async () => {
		const res = () =>
			Promise.resolve({
				ok: true,
				arrayBuffer: () => new ArrayBuffer(0),
			});
		global.fetch = jest.fn().mockImplementation(res);
		const result = await getDom('http://localhost:8080/');
		expect(result).not.toBeInstanceOf(Error);
		expect(result).toBeInstanceOf(Document);
	});
	test('abnormalCases', async () => {
		const res = () =>
			Promise.resolve({
				ok: false,
				statusText: '404 Not Found',
			});
		global.fetch = jest.fn().mockImplementation(res);
		const result = await getDom('http://localhost:8080/');
		expect(result).toBeInstanceOf(Error);
		expect((result as Error).message).toBe(
			'HTTP Request is failed. url: http://localhost:8080/ status: 404 Not Found',
		);
	});
});

describe('getPublishSoonList', () => {
	describe('abnormalCases', () => {
		test('API is Error', async () => {
			const res = () =>
				Promise.resolve({
					ok: false,
					statusText: '404 Not Found',
				});
			global.fetch = jest.fn().mockImplementation(res);
			const result = await getPublishSoonList('THEATER');
			expect(result).toBeInstanceOf(Error);
			expect((result as Error).message).toBe(
				'Can not get publish soon list. HTTP Request is failed. url: https://www.unitedcinemas.jp/THEATER/movie.php status: 404 Not Found',
			);
		});
		test('HTML is changed', async () => {
			const res = () =>
				Promise.resolve({
					ok: true,
					arrayBuffer: () => new ArrayBuffer(0),
				});
			global.fetch = jest.fn().mockImplementation(res);
			const result = await getPublishSoonList('THEATER');
			expect(result).toBeInstanceOf(Error);
			expect((result as Error).message).toBe('HTML is changed.');
		});
	});
});

describe('getCurrent', () => {
	describe('abnormalCases', () => {
		test('API is Error', async () => {
			const res = () =>
				Promise.resolve({
					ok: false,
					statusText: '404 Not Found',
				});
			global.fetch = jest.fn().mockImplementation(res);
			const result = await getCurrent('THEATER');
			expect(result).toBeInstanceOf(Error);
			expect((result as Error).message).toBe(
				'Can not get current list. HTTP Request is failed. url: https://www.unitedcinemas.jp/THEATER/film.php status: 404 Not Found',
			);
		});
		test('HTML is changed', async () => {
			const res = () =>
				Promise.resolve({
					ok: true,
					arrayBuffer: () => new ArrayBuffer(0),
				});
			global.fetch = jest.fn().mockImplementation(res);
			const result = await getCurrent('THEATER');
			expect(result).toBeInstanceOf(Error);
			expect((result as Error).message).toBe('HTML is changed.');
		});
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
