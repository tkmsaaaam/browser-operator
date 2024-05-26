import { describe, test, jest, expect, beforeEach } from '@jest/globals';
import jsdom from 'jsdom';
import { dom, getDom, makeEvent, pushToEvents } from '../src';

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

const parser = new dom.window.DOMParser();

describe('makeEvent', () => {
	test('normalCase', () => {
		const strHtml =
			'<head></head><body><h2>Japanese GP</h2><h3></h3><div><table><tr><td>2024年01月01日\n 12:00\t</td><td>FP1 \n\t</td><td>Max \n\t</td></tr></table></div></body>';
		const doc = parser.parseFromString(strHtml, 'text/html');
		const category = 'Formula1';
		const j = 0;
		const gpName = 'Japanese GP\t\n';
		const tds = doc.getElementsByTagName('div')[0].getElementsByTagName('td');
		const event = makeEvent(category, j, gpName, tds);
		expect(event).toStrictEqual({
			category: category,
			gpName: 'JapaneseGP  ',
			DateTimeStr: '2024年01月01日12:00',
			sessionName: 'FP1  ',
			commentators: 'Max,',
		});
	});
});

describe('pushToEvents', () => {
	describe('normalCase', () => {
		test('only F1', () => {
			const strHtml =
				'<head></head><body><h2>Japanese GP</h2><h3></h3><div><table><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></table></div></body>';
			const doc = parser.parseFromString(strHtml, 'text/html');
			const title = doc.getElementsByTagName('h2')[0];
			const [err, events] = pushToEvents(title, 'Japanese GP');
			expect(err?.message).toBe('It is not F2 title.');
			expect(events.length).toBe(5);
		});
		test('F1 and F2', () => {
			const strHtml =
				'<head></head><body><h2>Japanese GP</h2><h3></h3><div><table><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></table></div><h3>F2</h3><div><table><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></table></div></body>';
			const doc = parser.parseFromString(strHtml, 'text/html');
			const title = doc.getElementsByTagName('h2')[0];
			const [err, events] = pushToEvents(title, 'Japanese GP');
			expect(err).toBeUndefined;
			expect(events.length).toBe(9);
		});
	});
	describe('abnormalCase', () => {
		test('overview is not present', () => {
			const strHtml = '<head></head><body><h2>Japanese GP</h2></body>';
			const doc = parser.parseFromString(strHtml, 'text/html');
			const title = doc.getElementsByTagName('h2')[0];
			const [err, events] = pushToEvents(title, 'Japanese GP');
			expect(err?.message).toBe('It is not GP title. title: Japanese GPnull');
			expect(events.length).toBe(0);
		});
		test('overview is not h3', () => {
			const strHtml =
				'<head></head><body><h2>Japanese GP</h2><div></div></body>';
			const doc = parser.parseFromString(strHtml, 'text/html');
			const title = doc.getElementsByTagName('h2')[0];
			const [err, events] = pushToEvents(title, 'Japanese GP');
			expect(err?.message).toBe(
				'It is not GP title. title: Japanese GP[object HTMLDivElement]',
			);
			expect(events.length).toBe(0);
		});
		test('F1 table is not present', () => {
			const strHtml = '<head></head><body><h2>Japanese GP</h2><h3></h3></body>';
			const doc = parser.parseFromString(strHtml, 'text/html');
			const title = doc.getElementsByTagName('h2')[0];
			const [err, events] = pushToEvents(title, 'Japanese GP');
			expect(err?.message).toBe('It is not F1 table.null');
			expect(events.length).toBe(0);
		});
		test('F1 table is not div', () => {
			const strHtml =
				'<head></head><body><h2>Japanese GP</h2><h3></h3><h3></h3></body>';
			const doc = parser.parseFromString(strHtml, 'text/html');
			const title = doc.getElementsByTagName('h2')[0];
			const [err, events] = pushToEvents(title, 'Japanese GP');
			expect(err?.message).toBe(
				'It is not F1 table.[object HTMLHeadingElement]',
			);
			expect(events.length).toBe(0);
		});
		test("F1 table doesn't have enough td", () => {
			const strHtml =
				'<head></head><body><h2>Japanese GP</h2><h3></h3><div></div></body>';
			const doc = parser.parseFromString(strHtml, 'text/html');
			const title = doc.getElementsByTagName('h2')[0];
			const [err, events] = pushToEvents(title, 'Japanese GP');
			expect(err?.message).toBe("It doesn't have enough F1 td. Length:0");
			expect(events.length).toBe(0);
		});
		test("F2 table doesn't have enough td", () => {
			const strHtml =
				'<head></head><body><h2>Japanese GP</h2><h3></h3><div><table><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></table></div><div></div></body>';
			const doc = parser.parseFromString(strHtml, 'text/html');
			const title = doc.getElementsByTagName('h2')[0];
			const [err, events] = pushToEvents(title, 'Japanese GP');
			expect(err?.message).toBe('It is not F2 title.');
			expect(events.length).toBe(5);
		});
		test("F2 table doesn't have enough td", () => {
			const strHtml =
				'<head></head><body><h2>Japanese GP</h2><h3></h3><div><table><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></table></div><h3></h3><h3></h3></body>';
			const doc = parser.parseFromString(strHtml, 'text/html');
			const title = doc.getElementsByTagName('h2')[0];
			const [err, events] = pushToEvents(title, 'Japanese GP');
			expect(err?.message).toBe('It is not F2 table.');
			expect(events.length).toBe(5);
		});
		test("F2 table doesn't have enough td", () => {
			const strHtml =
				'<head></head><body><h2>Japanese GP</h2><h3></h3><div><table><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></table></div><h3></h3><div></div></body>';
			const doc = parser.parseFromString(strHtml, 'text/html');
			const title = doc.getElementsByTagName('h2')[0];
			const [err, events] = pushToEvents(title, 'Japanese GP');
			expect(err?.message).toBe("It doesn't have enough F2 td. Length:0");
			expect(events.length).toBe(5);
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
