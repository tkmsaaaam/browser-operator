import { describe, test, jest, expect } from '@jest/globals';
import jsdom from 'jsdom';
import { getDom, pushToEvents } from '../src';

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

beforeEach(() => {
	jest.resetModules();
});

describe('pushToEvents', () => {
	const dom = new jsdom.JSDOM();
	const parser = new dom.window.DOMParser();
	describe('abnormalCase', () => {
		test('overview is not present', () => {
			const strHtml = '<head></head><body><h2>Japanese GP</h2></body>';
			const doc = parser.parseFromString(strHtml, 'text/html');
			const title = doc.getElementsByTagName('h2')[0];
			const [err, events] = pushToEvents(title, 'Japanese GP');
			expect(err?.message).toBe('It is not GP title.null');
			expect(events.length).toBe(0);
		});
		test('overview is not h3', () => {
			const strHtml =
				'<head></head><body><h2>Japanese GP</h2><div></div></body>';
			const doc = parser.parseFromString(strHtml, 'text/html');
			const title = doc.getElementsByTagName('h2')[0];
			const [err, events] = pushToEvents(title, 'Japanese GP');
			expect(err?.message).toBe('It is not GP title.[object HTMLDivElement]');
			expect(events.length).toBe(0);
		});
	});
});

describe('getDom', () => {
	test('normalCase', async () => {
		const strHtml = '<head></head><body></body>';
		const res = () =>
			Promise.resolve({
				ok: true,
				text: () => Promise.resolve(strHtml),
			});
		global.fetch = jest.fn().mockImplementation(res);

		const dom = new jsdom.JSDOM();
		const parser = new dom.window.DOMParser();
		const toBe = parser.parseFromString(strHtml, 'text/html');

		const doc = await getDom();
		expect(doc).toEqual(toBe);
		global.fetch.mockClear();
	});

	test('abnormalCase', async () => {
		const res = () =>
			Promise.resolve({
				ok: false,
			});
		global.fetch = jest.fn().mockImplementation(res);

		const doc = await getDom();
		expect(doc).toBeInstanceOf(Error);
		expect((doc as Error).message).toBe(
			'Request is failed.(https://www.dazn.com/ja-JP/news/%E3%83%A2%E3%83%BC%E3%82%BF%E3%83%BC%E3%82%B9%E3%83%9D%E3%83%BC%E3%83%84/f1-calendar-schedule-broacast/1nyjy9o1q8esy16dsqpurlrwjs)',
		);
		global.fetch.mockClear();
	});
});
