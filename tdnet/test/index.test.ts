import { describe, expect, test, jest } from '@jest/globals';
import {
	makeArg,
	makeDateDiff,
	makeEnd,
	makePath,
	makeStart,
	makeTargetDate,
} from '../src';

describe('makeArg', () => {
	test('normalCaseUndefined', () => {
		process.argv.length = 0;
		expect(makeArg('last')).toBe(undefined);
	});
	test('normalCaseDefinedLong', () => {
		process.argv.length = 0;
		process.argv.push('last=20240101');
		expect(makeArg('last')).toBe('20240101');
	});
	test('normalCaseDefinedShort', () => {
		process.argv.length = 0;
		process.argv.push('l=20240101');
		expect(makeArg('last')).toBe('20240101');
	});
});

describe('makeStart', () => {
	test('normalCaseUndefined', () => {
		process.argv.length = 0;
		expect(makeStart()).toBe(undefined);
	});
	test('normalCaseDefinedLong', () => {
		process.argv.length = 0;
		process.argv.push('start=7');
		expect(makeStart()).toBe(7);
	});
	test('normalCaseDefinedShort', () => {
		process.argv.length = 0;
		process.argv.push('s=7');
		expect(makeStart()).toBe(7);
	});
	test('abnormalCase', () => {
		process.argv.length = 0;
		process.argv.push('s=s');
		expect(makeStart()).toBe(NaN);
	});
});

describe('makeEnd', () => {
	test('normalCaseUndefined', () => {
		process.argv.length = 0;
		expect(makeEnd()).toBe(0);
	});
	test('normalCaseDefinedLong', () => {
		process.argv.length = 0;
		process.argv.push('end=7');
		expect(makeEnd()).toBe(7);
	});
	test('normalCaseDefinedShort', () => {
		process.argv.length = 0;
		process.argv.push('e=7');
		expect(makeEnd()).toBe(7);
	});
	test('normalCaseWithoutEnv', () => {
		process.argv.length = 0;
		expect(makeEnd()).toBe(0);
	});
	test('abnormalCase', () => {
		process.argv.length = 0;
		process.argv.push('e=e');
		expect(makeEnd()).toBe(NaN);
	});
});

describe('makeDateDiff', () => {
	test('normalCaseUndefined', () => {
		process.argv.length = 0;
		expect(makeDateDiff()).toBe(0);
	});
	test('normalCaseDefinedLong', () => {
		process.argv.length = 0;
		process.argv.push('diff=7');
		expect(makeDateDiff()).toBe(7);
	});
	test('normalCaseDefinedShort', () => {
		process.argv.length = 0;
		process.argv.push('d=7');
		expect(makeDateDiff()).toBe(7);
	});
	test('normalCaseWithoutEnv', () => {
		process.argv.length = 0;
		expect(makeDateDiff()).toBe(0);
	});
	test('abnormalCase', () => {
		process.argv.length = 0;
		process.argv.push('d=d');
		expect(makeDateDiff()).toBe(NaN);
	});
});

describe('makeTargetDate', () => {
	test('normalDiffIsZero', () => {
		const mockDate = new Date(2024, 0, 1, 1, 1, 1);
		jest.useFakeTimers();
		jest.setSystemTime(mockDate);
		expect(makeTargetDate(0)).toBe('20240101');
	});
	test('normalDiffIsOne', () => {
		const mockDate = new Date(2024, 0, 1, 1, 1, 1);
		jest.useFakeTimers();
		jest.setSystemTime(mockDate);
		expect(makeTargetDate(1)).toBe('20231231');
	});
});

describe('makePath', () => {
	test('normalCase', () => {
		expect(makePath(1, '20240101')).toBe('I_list_001_20240101.html');
	});
});
