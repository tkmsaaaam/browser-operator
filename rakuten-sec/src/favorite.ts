import { Page } from 'puppeteer-core';

type FavoriteStrings = {
	code: string;
	name: string;
	market: string;
	current: string;
	updatedAt: string;
	diff: string;
	diffRate: string;
	transaction: string;
};

export type Favorite = {
	code: number;
	name: string;
	market: string;
	current: number;
	updatedAt: string;
	diff: number;
	diffRate: number;
	transaction: number;
};

export const getFavoriteList = async (page: Page, bvSessionId: string) => {
	const FAVORITE_LIST =
		'https://member.rakuten-sec.co.jp/app/info_jp_prc_reg_lst.do;';
	await Promise.all([
		page.waitForSelector('[class="tbl-data-01"]'),
		page.goto(FAVORITE_LIST + bvSessionId + '?eventType=init'),
	]);
	const favoriteStringsList = await makeFavoriteStrings(page);
	return favoriteStringsList.map(f => makeFavorite(f));
};

const makeFavoriteStrings = async (page: Page): Promise<FavoriteStrings[]> => {
	return await page.evaluate((list: FavoriteStrings[]) => {
		const trList = document
			.getElementsByClassName('tbl-data-01')[0]
			.getElementsByTagName('tbody')[0];
		for (
			let index = 1;
			index < trList.getElementsByTagName('tr').length - 1;
			index++
		) {
			const element = trList
				.getElementsByTagName('tr')
				// eslint-disable-next-line no-unexpected-multiline
				[index].getElementsByTagName('td');
			const favorite: FavoriteStrings = {
				code: element[1].innerText,
				name: element[3].innerText,
				market: element[6].innerText,
				current: element[7].innerText.replace(/↓|↑|,/g, ''),
				updatedAt: element[8].innerText,
				diff: element[9].innerText,
				diffRate: element[10].innerText.replace('%', ''),
				transaction: element[11].innerText.replace(/株|,/g, ''),
			};
			list.push(favorite);
		}
		return list;
	}, []);
};

const makeFavorite = (favoriteStrings: FavoriteStrings): Favorite => {
	return {
		code: Number(favoriteStrings.code),
		name: favoriteStrings.name,
		market: favoriteStrings.market,
		current: Number(favoriteStrings.current.replace(/↓|↑|,/g, '')),
		updatedAt: favoriteStrings.updatedAt,
		diff: Number(favoriteStrings.diff),
		diffRate: Number(favoriteStrings.diffRate.replace('%', '')),
		transaction: Number(favoriteStrings.transaction.replace(/株|,/g, '')),
	};
};
