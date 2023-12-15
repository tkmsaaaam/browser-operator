import { Page } from 'puppeteer-core';
import { sleep } from './index';

export type Asset = {
	total: Total;
	possessList: Possess[];
};

type Total = {
	amount: number;
	diff: number;
	diffRate: number;
};

type Possess = {
	securityType: string;
	name: string;
	accountType: string;
	buyPrice: number;
	currentPrice: number;
	diff: number;
	diffRate: number;
	count: number;
	totalAmount: number;
	profit: number;
	profitRate: number;
};

type AssetStrings = {
	total: TotalStrings;
	possessList: PossessStrings[];
};

type TotalStrings = {
	amount: string;
	diff: string;
};

type PossessStrings = {
	securityType: string;
	name: string;
	accountType: string;
	buyPrice: string;
	currentPrice: string;
	diff: string;
	count: string;
	totalAmount: string;
	profit: string;
};

export const getAsset = async (
	page: Page,
	bvSessionId: string,
): Promise<Asset> => {
	const ALL_ASSET_LIST_URL =
		'https://member.rakuten-sec.co.jp/app/ass_all_possess_lst.do;';
	await page.goto(
		ALL_ASSET_LIST_URL +
			bvSessionId +
			'?eventType=directInit&l-id=mem_pc_top_all-possess-lst&gmn=H&smn=01&lmn=&fmn=',
	);

	await sleep(3);
	const assetStrings = await makeAssetStrings(page);
	return makeAsset(assetStrings);
};

const makeAssetStrings = async (page: Page): Promise<AssetStrings> => {
	const asset: AssetStrings = {
		total: { amount: '0', diff: '0' },
		possessList: [],
	};
	return await page.evaluate((asset: AssetStrings) => {
		asset.total.amount = (
			document.querySelector(
				'td[class="R1 B3 f105p"] span[class="fb"]',
			) as HTMLSpanElement
		).innerText;

		asset.total.diff = (
			document.querySelector('span[class="PLY"]') as HTMLSpanElement
		).innerText;

		const tableProcessData = document.getElementById('table_possess_data');
		if (!tableProcessData) return asset;
		const possessList = tableProcessData.getElementsByTagName('tr');
		for (let index = 3; index < possessList.length; index++) {
			const dataRaw = possessList[index].getElementsByTagName('td');
			const securityType = dataRaw[0].innerText;
			if (securityType == '米国株式') {
				const possess: PossessStrings = {
					securityType: securityType,
					name: dataRaw[1].innerText,
					accountType: dataRaw[3].innerText,
					buyPrice: dataRaw[5].innerText,
					currentPrice: dataRaw[6].getElementsByTagName('div')[0].innerText,
					diff: dataRaw[6].getElementsByTagName('div')[1].innerText,
					count: dataRaw[4].innerText,
					totalAmount: dataRaw[7].getElementsByTagName('div')[0].innerText,
					profit: dataRaw[7].getElementsByTagName('div')[2].innerText,
				};
				asset.possessList.push(possess);
			} else {
				const possess: PossessStrings = {
					securityType: securityType,
					name: dataRaw[1].innerText,
					accountType: dataRaw[2].innerText,
					buyPrice: dataRaw[4].innerText,
					currentPrice: dataRaw[5].getElementsByTagName('div')[0].innerText,
					diff: dataRaw[5].getElementsByTagName('div')[1].innerText,
					count: dataRaw[3].innerText,
					totalAmount: dataRaw[6].getElementsByTagName('div')[0].innerText,
					profit: dataRaw[6].getElementsByTagName('div')[2].innerText,
				};
				asset.possessList.push(possess);
			}
		}
		return asset;
	}, asset);
};

const makeAsset = (assetStrings: AssetStrings): Asset => {
	return {
		total: makeTotal(assetStrings.total),
		possessList: assetStrings.possessList.map(p => makePossess(p)),
	};
};

const makeTotal = (totalStrings: TotalStrings): Total => {
	const amount = Number(totalStrings.amount.replace(/円|,/g, ''));
	const diff = Number(totalStrings.diff.replace(/円|,/g, ''));
	return {
		amount: amount,
		diff: diff,
		diffRate: (diff / amount) * 100,
	};
};

const makePossess = (possessStrings: PossessStrings): Possess => {
	const currentPrice = Number(
		possessStrings.currentPrice.replace(/円\/USD|円|USD|,/g, ''),
	);
	const diff = Number(possessStrings.diff.replace(/円|USD|円\/USD|,/g, ''));
	const profit = Number(possessStrings.profit.replace(/円|,|\n|\t/g, ''));
	const totalAmount = Number(possessStrings.totalAmount.replace(/円|,/g, ''));
	let profitRate = 0;
	if (profit >= 0) {
		profitRate = profit / totalAmount;
	} else {
		profitRate = profit / (totalAmount - profit);
	}
	return {
		securityType: possessStrings.securityType,
		name: possessStrings.name,
		accountType: possessStrings.accountType.replace(/\n/g, ''),
		buyPrice: Number(possessStrings.buyPrice.replace(/円|USD|円\/USD|,/g, '')),
		currentPrice: currentPrice,
		diff: diff,
		diffRate: (diff / currentPrice) * 100,
		count: Number(possessStrings.count.replace(/口|株|USD|,/g, '')),
		totalAmount: totalAmount,
		profit: profit,
		profitRate: profitRate * 100,
	};
};
