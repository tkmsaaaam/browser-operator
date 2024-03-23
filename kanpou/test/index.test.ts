import { describe, test, expect } from '@jest/globals';
import { makeFileName } from '../src';

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
