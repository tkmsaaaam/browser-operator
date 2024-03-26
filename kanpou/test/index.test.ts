import { describe, test, jest, expect } from '@jest/globals';
import { getDom, jsdom, makeFileName } from '../src';

jest.mock('log4js', () => {
	return {
		getLogger: jest.fn().mockImplementation(() => ({
			level: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		})),
	};
});

describe('getDom', () => {
	test('normalCases', async () => {
		const res = () =>
			Promise.resolve({
				ok: true,
				statusText: '404 Not Found',
				text: () => '',
			});
		global.fetch = jest.fn().mockImplementation(res);
		const dom = await getDom('url');
		expect(dom).toBeInstanceOf(jsdom.window.Document);
	});
	describe('abnormalCases', () => {
		test('fetch is Error', async () => {
			const res = () =>
				Promise.resolve({
					ok: false,
					statusText: '404 Not Found',
				});
			global.fetch = jest.fn().mockImplementation(res);
			const dom = await getDom('url');
			expect(dom).toBeInstanceOf(Error);
			expect((dom as Error).message).toBe(
				`Can not get dom. HTTP request is failed. res status: 404 Not Found`,
			);
		});
	});
});

describe('makeFileName', () => {
	describe('normalCases', () => {
		test('fromDot', () => {
			const path = './example.pdf';
			const res = makeFileName(path);
			expect(res).toBe('example.pdf');
		});
		test('fromSlash', () => {
			const path = '/example.pdf';
			const res = makeFileName(path);
			expect(res).toBe('example.pdf');
		});
		test('fromAlphabet', () => {
			const path = 'example.pdf';
			const res = makeFileName(path);
			expect(res).toBe('example.pdf');
		});
	});
	describe('abnormalCases', () => {
		test('directory', () => {
			const path = 'dir/';
			const res = makeFileName(path);
			expect((res as Error).message).toBe(
				`Can not get fileName. path: /${path}`,
			);
		});
		test('isNotPdf', () => {
			const path = '/example.csv';
			const res = makeFileName(path);
			expect((res as Error).message).toBe(
				`Can not make pdf path. fileName: example.csv`,
			);
		});
	});
});
