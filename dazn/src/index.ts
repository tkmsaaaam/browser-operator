import puppeteer from 'puppeteer-core';
import open from 'open';

type Event = {
	category: string;
	DateTimeStr: string;
	name: string;
	commentators: string;
};

type Events = Event[];

const DAZN_URL =
	'https://www.dazn.com/ja-JP/news/%E3%83%A2%E3%83%BC%E3%82%BF%E3%83%BC%E3%82%B9%E3%83%9D%E3%83%BC%E3%83%84/f1-calendar-schedule-broacast/1nyjy9o1q8esy16dsqpurlrwjs';

const CALENDAR_BASE_URL =
	'https://www.google.com/calendar/render?action=TEMPLATE';
const INTERVAL = 10;
const YEAR = '2023';

const sleep = (time: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

(async () => {
	const targetGpName = process.argv[2];
	if (!targetGpName) return;
	const browser = await puppeteer.launch({
		channel: 'chrome',
		headless: true,
	});
	const page = await browser.newPage();
	await page.goto(DAZN_URL);
	await sleep(INTERVAL);

	const es: Events = [];

	const raceEvents = await page.evaluate(
		(events: Events, gpName: string) => {
			const titles = document.getElementsByTagName('h2');
			const getTdInnerText = (
				htmlTableElement: HTMLTableElement,
				i: number
			): string => {
				return htmlTableElement.getElementsByTagName('td')[i].innerText;
			};

			for (let index = 0; index < titles.length; index++) {
				const title = titles[index];
				if (title.innerText.indexOf(gpName) != -1) {
					const f1Table = title.nextSibling?.nextSibling;
					for (let j = 0; j < 5; j++) {
						const event: Event = {
							category: 'Formula1',
							DateTimeStr: getTdInnerText(
								f1Table as HTMLTableElement,
								j * 3
							).replace('\n', ''),
							name: getTdInnerText(
								f1Table as HTMLTableElement,
								j * 3 + 1
							).replace('\n', ''),
							commentators: getTdInnerText(
								f1Table as HTMLTableElement,
								j * 3 + 2
							).replace('\n', ','),
						};
						events.push(event);
					}

					const f2Title = f1Table?.nextSibling;
					if ((f2Title as HTMLHeadElement).innerText.indexOf('F2') != -1) {
						const f2Table = f2Title?.nextSibling;
						for (let j = 0; j < 4; j++) {
							const event: Event = {
								category: 'Formula2',
								DateTimeStr: getTdInnerText(
									f2Table as HTMLTableElement,
									j * 3
								).replace('\n', ''),
								name: getTdInnerText(
									f2Table as HTMLTableElement,
									j * 3 + 1
								).replace('\n', ''),
								commentators: getTdInnerText(
									f2Table as HTMLTableElement,
									j * 3 + 2
								).replace('\n', ','),
							};
							events.push(event);
						}
					}
				}
			}
			return events;
		},
		es,
		targetGpName
	);
	for (const raceEvent of raceEvents) {
		const month = raceEvent.DateTimeStr.slice(
			0,
			raceEvent.DateTimeStr.indexOf('月')
		).padStart(2, '0');
		const date = raceEvent.DateTimeStr.slice(
			raceEvent.DateTimeStr.indexOf('月') + 1,
			raceEvent.DateTimeStr.indexOf('日')
		).padStart(2, '0');
		const startTime = raceEvent.DateTimeStr.slice(
			raceEvent.DateTimeStr.indexOf('）') + 1,
			raceEvent.DateTimeStr.indexOf('）') + 6
		).replace(':', '');
		const endTime = String(Number(startTime) + 100);

		const url = `${CALENDAR_BASE_URL}&text=${raceEvent.category}${raceEvent.name}&details=${YEAR}${raceEvent.category}${targetGpName}GP${raceEvent.commentators}&dates=${YEAR}${month}${date}T${startTime}00/${YEAR}${month}${date}T${endTime}00`;
		open(url);
	}
	await browser.close();
})();
