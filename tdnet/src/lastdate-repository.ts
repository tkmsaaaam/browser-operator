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
	return Math.floor((currentDate - lastDate) / 1000 / 60 / 60 / 24);
};

export const saveLastDate = (end: number) => {
	const currentDate = new Date();

	const lastDate = new Date(currentDate.setDate(currentDate.getDate() - end));
	const file = path.resolve(__dirname, '../.env/lastDate.txt');
	fs.writeFileSync(
		file,
		`${lastDate.getFullYear()}/${lastDate.getMonth() + 1}/${lastDate.getDate()}`
	);
};
