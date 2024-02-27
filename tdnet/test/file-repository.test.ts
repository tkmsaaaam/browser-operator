import { describe, test, jest, expect } from '@jest/globals';
import { getLastDateDiff } from '../src/file-repository';

describe('getLastDateDiff', () => {
	jest.mock('path', () => ({
		resolve: () => 'test',
	}));
	// test('abnormalCase', () => {
	// 	jest.mock('fs', () => ({
	// 		existsSync: () => false,
	// 		readFileSync: () => '2023-12-30',
	// 	}));
	// 	expect(getLastDateDiff()).toBe(30);
	// });
	test('normalCase', () => {
		jest.mock('fs', () => ({
			existsSync: () => true,
			readFileSync: () => '2023-12-30',
		}));
		Date.now = jest.fn(() => 1704078000000);
		Date.parse = jest.fn(() => 1703894400000);
		expect(getLastDateDiff()).toBe(1);
	});
});
