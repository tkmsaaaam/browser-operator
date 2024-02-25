import fs from 'fs';
import path from 'path';

export const getLastDateDiff = (): number => {
	const file = path.resolve(__dirname, '../.env/lastDate.txt');
	if (!fs.existsSync(file)) {
		const DEFAULT_MONTHLY_DAYS_COUNT = 30;
		saveLastDate(DEFAULT_MONTHLY_DAYS_COUNT);
		return DEFAULT_MONTHLY_DAYS_COUNT;
	}
	const lastDateStr = fs.readFileSync(file).toString();
	const lastDate = Date.parse(lastDateStr);
	const currentDate = Date.now();
	return Math.floor((currentDate - lastDate) / 1000 / 60 / 60 / 24) - 1;
};

export const saveLastDate = (end: number) => {
	const currentDate = new Date();

	const lastDate = new Date(currentDate.setDate(currentDate.getDate() - end));
	const file = path.resolve(__dirname, '../.env/lastDate.txt');
	fs.writeFileSync(
		file,
		`${lastDate.getFullYear()}/${
			lastDate.getMonth() + 1
		}/${lastDate.getDate()}`,
	);
};

export const getFavoriteList = (): string[] => {
	const favoritesFilePath = process.env.FAVORITES_FILE_PATH;
	let filePath;
	if (favoritesFilePath) {
		filePath = favoritesFilePath;
	} else {
		filePath = '../.env/favorite.txt';
	}
	if (!fs.existsSync(filePath)) {
		return [];
	}
	const file = path.resolve(__dirname, filePath);
	const codes: string[] = [];
	Array.from(
		new Set(fs.readFileSync(file).toString().replace(/\s/g, '').split(',')),
	)
		.filter(code => !(code == ''))
		.sort((f, s) => {
			if (f < s) return -1;
			if (f > s) return 1;
			return 0;
		})
		.forEach(argCode => {
			if (argCode.includes('#')) {
				codes.push(argCode.slice(0, argCode.indexOf('#')));
			} else {
				codes.push(argCode);
			}
		});
	return codes;
};

export const saveFavoriteList = (codes: string[]) => {
	const favoritesFilePath = process.env.FAVORITES_FILE_PATH;
	let filePath;
	if (favoritesFilePath) {
		filePath = favoritesFilePath;
	} else {
		filePath = '../.env/favorite.txt';
	}
	if (!fs.existsSync(filePath)) {
		return;
	}
	const file = path.resolve(__dirname, filePath);
	let newFavorites = '';
	codes.forEach(code => {
		newFavorites += code + ',\n';
	});
	fs.writeFileSync(file, newFavorites);
};
