import { describe, expect, test, jest } from '@jest/globals';
import {
	Disclosure,
	convertFromDocToList,
	makeArg,
	makeDateDiff,
	makeEnd,
	makeLastDate,
	makePath,
	makeStart,
	makeTargetCodes,
	makeTargetDate,
	sortList,
} from '../src/index';
import { JSDOM } from 'jsdom';

jest.mock('../src/file-repository', () => ({
	getLastDateDiff: () => 0,
	saveLastDate: () => {},
	getFavoriteList: () => [],
	saveFavoriteList: () => {},
}));
jest.mock('../src/http-client', () => ({
	getDom: () => undefined,
}));

describe('makeLastDate', () => {
	test('normalCaseUndefined', () => {
		process.argv.length = 0;
		expect(makeLastDate()).toBe(undefined);
	});
	test('normalCaseWithLongArg', () => {
		process.argv.length = 0;
		process.argv.push('last=true');
		expect(makeLastDate()).toBe(0);
	});
	test('normalCaseWithShortArg', () => {
		process.argv.length = 0;
		process.argv.push('l=true');
		expect(makeLastDate()).toBe(0);
	});
});

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

describe('convertFromDocToList', () => {
	test('normalCaseWithoutTable', () => {
		const jsdom = new JSDOM();
		const parser = new jsdom.window.DOMParser();
		const strhtml =
			'<!DOCTYPE html><html><head></head><body><form><table><tr><td><div><table><tr><td><div id="kaiji-date-1">2024年01月01日</div><div id="kaiji-text-1">に開示された情報はありません。</div></td></tr></table></div></td></tr></table></form></body></html>';
		const doc = parser.parseFromString(strhtml, 'text/html');
		expect(convertFromDocToList(doc).toString()).toBe([].toString());
	});
	test('normalCaseWithACompany', () => {
		const jsdom = new JSDOM();
		const parser = new jsdom.window.DOMParser();
		const strhtml =
			'<!DOCTYPE html><html><head></head><body><form><table><tr><table><tr><td><div id="kaiji-date-1">2024年01月01日</div><div>に開示された情報</div></td></tr></table><table><tr><td>時刻</td><td>コード</td><td>会社名</td><td>表題</td><td>XBRL</td><td>上場取引所</td><td>更新履歴</td></tr></table></div><div><table id="main-list-table"><tr><td>08:00</td><td>0000</td><td>companyA</td><td><a href="companyA.pdf" target="_blank">配当に関するお知らせ</a></td><td></td><td>東</td><td></td></tr></table></div></td></tr></table></form></body></html>';
		const doc = parser.parseFromString(strhtml, 'text/html');
		const result: Disclosure[] = [
			{
				datetime: '2024/01/01 08:00',
				code: '0000',
				name: 'companyA',
				title: '配当に関するお知らせ',
				url: '/companyD.pdf',
				market: '東',
				update: '',
			},
		];
		expect(convertFromDocToList(doc).toString()).toBe(result.toString());
	});
	test('normalCaseWithoutDate', () => {
		const jsdom = new JSDOM();
		const parser = new jsdom.window.DOMParser();
		const strhtml =
			'<!DOCTYPE html><html><head></head><body><form><table><tr><table><tr><td><div id="kaiji-date-1"></div><div>に開示された情報</div></td></tr></table><table><tr><td>時刻</td><td>コード</td><td>会社名</td><td>表題</td><td>XBRL</td><td>上場取引所</td><td>更新履歴</td></tr></table></div><div><table id="main-list-table"><tr><td>08:00</td><td>0000</td><td>companyA</td><td><a href="companyA.pdf" target="_blank">配当に関するお知らせ</a></td><td></td><td>東</td><td></td></tr></table></div></td></tr></table></form></body></html>';
		const doc = parser.parseFromString(strhtml, 'text/html');
		expect(convertFromDocToList(doc).toString()).toBe([].toString());
	});
});

describe('makePath', () => {
	test('normalCase', () => {
		expect(makePath(1, '20240101')).toBe('I_list_001_20240101.html');
	});
});

describe('makeTargetCodes', () => {
	test('normalCaseCodeIsUndefined', () => {
		process.argv.length = 0;
		expect(makeTargetCodes()).toBe(undefined);
	});
	test('normalCaseCodeIsUndefined', () => {
		process.argv.length = 0;
		process.argv.push('code=0000');
		expect(makeTargetCodes()?.toString()).toBe(['0000'].toString());
	});
	test('normalCaseCodeIsUndefined', () => {
		process.argv.length = 0;
		process.argv.push('c=0000');
		expect(makeTargetCodes()?.toString()).toBe(['0000'].toString());
	});
});

describe('sorotList', () => {
	test('normalCase', () => {
		const arg: Disclosure[] = [
			{
				datetime: '2024/01/04 08:00',
				code: '0003',
				name: 'companyA',
				title: '決算説明会資料',
				url: '/companyA.pdf',
				market: '東',
				update: '',
			},
			{
				datetime: '2024/01/04 18:00',
				code: '0001',
				name: 'companyB',
				title: '役員の異動に関するお知らせ',
				url: '/companyB.pdf',
				market: '東',
				update: '',
			},
			{
				datetime: '2024/01/04 18:00',
				code: '0001',
				name: 'companyB',
				title: '代表取締役の異動に関するお知らせ',
				url: '/companyB_2.pdf',
				market: '東',
				update: '',
			},
			{
				datetime: '2024/01/04 08:30',
				code: '0004',
				name: 'companyC',
				title: '決算短信',
				url: '/companyC.pdf',
				market: '東',
				update: '',
			},
			{
				datetime: '2024/01/04 08:00',
				code: '0002',
				name: 'companyD',
				title: '配当に関するお知らせ',
				url: '/companyD.pdf',
				market: '東',
				update: '',
			},
		];
		const result: Disclosure[] = [
			{
				datetime: '2024/01/04 08:00',
				code: '0002',
				name: 'companyD',
				title: '配当に関するお知らせ',
				url: '/companyD.pdf',
				market: '東',
				update: '',
			},
			{
				datetime: '2024/01/04 08:00',
				code: '0003',
				name: 'companyA',
				title: '決算説明会資料',
				url: '/companyA.pdf',
				market: '東',
				update: '',
			},
			{
				datetime: '2024/01/04 08:30',
				code: '0004',
				name: 'companyC',
				title: '決算短信',
				url: '/companyC.pdf',
				market: '東',
				update: '',
			},
			{
				datetime: '2024/01/04 18:00',
				code: '0001',
				name: 'companyB',
				title: '役員の異動に関するお知らせ',
				url: '/companyB.pdf',
				market: '東',
				update: '',
			},
			{
				datetime: '2024/01/04 18:00',
				code: '0001',
				name: 'companyB',
				title: '代表取締役の異動に関するお知らせ',
				url: '/companyB_2.pdf',
				market: '東',
				update: '',
			},
		];
		expect(sortList(arg).toString()).toBe(result.toString());
	});
});
