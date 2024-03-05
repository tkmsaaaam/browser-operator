import open from 'open';
import { JSDOM } from 'jsdom';

type Event = {
	category: string;
	gpName: string;
	DateTimeStr: string;
	name: string;
	commentators: string;
};

type Events = Event[];

const DAZN_URL =
	'https://www.dazn.com/ja-JP/news/%E3%83%A2%E3%83%BC%E3%82%BF%E3%83%BC%E3%82%B9%E3%83%9D%E3%83%BC%E3%83%84/f1-calendar-schedule-broacast/1nyjy9o1q8esy16dsqpurlrwjs';

const CALENDAR_BASE_URL =
	'https://www.google.com/calendar/render?action=TEMPLATE';
const YEAR = '2024';

const getTdInnerText = (
	htmlTableElement: HTMLTableElement,
	i: number,
): string => {
	return htmlTableElement.getElementsByTagName('td')[i].textContent!;
};

const makeEvent = (
	category: string,
	table: HTMLTableElement,
	j: number,
	gpName: string,
): Event => {
	const event: Event = {
		category: category,
		gpName: gpName,
		DateTimeStr: getTdInnerText(table, j * 3).replace('\n', ''),
		name: getTdInnerText(table, j * 3 + 1).replace('\n', ''),
		commentators: getTdInnerText(table, j * 3 + 2).replace('\n', ','),
	};
	return event;
};

const pushToEvents = (
	title: HTMLHeadingElement,
	gpName: string,
): Error | Event[] => {
	const paragragh = title.nextElementSibling;
	if (paragragh == null) {
		const message = 'It is not paragraph.';
		return new Error(message);
	}

	const f1Table = paragragh.nextElementSibling as HTMLTableElement;
	if (f1Table.getElementsByTagName('td').length < 15) {
		const message = "It doesn't have enough td.";
		return new Error(message);
	}

	const raceEvents: Event[] = [];
	for (let j = 0; j < 5; j++) {
		const event: Event = makeEvent('Formula1', f1Table, j, gpName);
		raceEvents.push(event);
	}
	const f2Title = f1Table.nextSibling?.nextSibling as HTMLHeadElement;
	if (f2Title && f2Title.textContent!.indexOf('F2') != -1) {
		const f2Table = f2Title.nextSibling?.nextSibling as HTMLTableElement;
		for (let j = 0; j < 4; j++) {
			const event: Event = makeEvent(
				'Formula2',
				f2Table,
				j,
				f2Title.textContent!,
			);
			raceEvents.push(event);
		}
	}
	return raceEvents;
};

(async () => {
	const targetGpName = process.argv[2];
	const res = await fetch(DAZN_URL);
	const strhtml = await res.text();

	const jsdom = new JSDOM();
	const parser = new jsdom.window.DOMParser();
	const doc = parser.parseFromString(strhtml, 'text/html');

	const raceEvents: Events = [];
	const titles = doc.getElementsByTagName('h2');

	if (!targetGpName) {
		const events = pushToEvents(titles[1], titles[1].textContent!);
		if (events instanceof Error) {
			console.error(events.message);
			return;
		} else {
			for (const e of events) {
				raceEvents.push(e);
			}
		}
	}
	for (const title of titles) {
		if (title.textContent && title.textContent.indexOf(targetGpName) != -1) {
			console.log(title.textContent);
			const events = pushToEvents(title, title.textContent);
			if (events instanceof Error) {
				console.error(events.message);
				console.log(title.nextElementSibling?.textContent);
				console.log(title.nextElementSibling?.nextElementSibling?.textContent);
				return;
			} else {
				for (const e of events) {
					raceEvents.push(e);
				}
			}
			break;
		}
	}

	for (const raceEvent of raceEvents) {
		const month = raceEvent.DateTimeStr.slice(
			0,
			raceEvent.DateTimeStr.indexOf('月'),
		).padStart(2, '0');
		const date = raceEvent.DateTimeStr.slice(
			raceEvent.DateTimeStr.indexOf('月') + 1,
			raceEvent.DateTimeStr.indexOf('日'),
		).padStart(2, '0');
		const startTime = raceEvent.DateTimeStr.slice(
			raceEvent.DateTimeStr.indexOf('）') + 1,
			raceEvent.DateTimeStr.indexOf('）') + 6,
		)
			.replace(':', '')
			.padStart(4, '0');
		let diff = 100;
		if (raceEvent.name.indexOf('決勝') != -1) {
			diff = 200;
		}
		const endTime = String(Number(startTime) + diff).padStart(4, '0');

		const url = `${CALENDAR_BASE_URL}&text=${raceEvent.category}${raceEvent.name}&details=${YEAR}${raceEvent.category}${raceEvent.gpName}${raceEvent.commentators}&dates=${YEAR}${month}${date}T${startTime}00/${YEAR}${month}${date}T${endTime}00`;
		open(url);
	}
})();
