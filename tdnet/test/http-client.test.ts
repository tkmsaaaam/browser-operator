import { describe, test, jest, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { getDom } from '../src/http-client';

describe('getDom', () => {
	test('normalCase', async () => {

		const res = () => Promise.resolve({text: () => Promise.resolve('<head></head><body></body>'),});
		global.fetch = jest.fn().mockImplementation(res);

		const strhtml = '<head></head><body></body>';

		const jsdom = new JSDOM();
		const parser = new jsdom.window.DOMParser();
		const toBe = parser.parseFromString(strhtml, 'text/html');
		const ex = await getDom('test');
		expect(ex).toEqual(toBe);
    global.fetch.mockClear()
	});
});
