import open from 'open';
import jsdom from 'jsdom';

type Event = {
	category: string;
	gpName: string;
	DateTimeStr: string;
	name: string;
	commentators: string;
};

const DAZN_URL =
	'https://www.dazn.com/ja-JP/news/%E3%83%A2%E3%83%BC%E3%82%BF%E3%83%BC%E3%82%B9%E3%83%9D%E3%83%BC%E3%83%84/f1-calendar-schedule-broacast/1nyjy9o1q8esy16dsqpurlrwjs';

const CALENDAR_BASE_URL =
	'https://www.google.com/calendar/render?action=TEMPLATE';
const YEAR = '2024';

const dom = new jsdom.JSDOM();
const window = dom.window;

const getTdInnerText = (
	tds: HTMLCollectionOf<HTMLTableCellElement>,
	i: number,
): string => {
	return tds[i].textContent!;
};

const makeEvent = (
	category: string,
	j: number,
	gpName: string,
	tds: HTMLCollectionOf<HTMLTableCellElement>,
): Event => {
	const event: Event = {
		category: category,
		gpName: gpName.replaceAll('\n', ' ').replaceAll('\t', ' '),
		DateTimeStr: getTdInnerText(tds, j * 3)
			.replaceAll('\n', '')
			.replaceAll('\t', ' '),
		name: getTdInnerText(tds, j * 3 + 1)
			.replaceAll('\n', ' ')
			.replaceAll('\t', ' '),
		commentators: getTdInnerText(tds, j * 3 + 2)
			.replaceAll('\n', ',')
			.replaceAll('\t', ''),
	};
	return event;
};

const pushToEvents = (
	title: HTMLHeadingElement,
	gpName: string,
): Error | Event[] => {
	const period = title.nextElementSibling;
	if (!(period instanceof window.HTMLParagraphElement)) {
		const message = 'It is not period.';
		return new Error(message + period);
	}

	const overview = period.nextElementSibling;
	if (!(overview instanceof window.HTMLHeadingElement)) {
		const message = 'It is not GP title.';
		return new Error(message + overview);
	}

	const f1Table = overview.nextElementSibling;
	if (!(f1Table instanceof window.HTMLDivElement)) {
		const message = 'It is not F1 table.';
		return new Error(message + f1Table);
	}
	const f1Tds = f1Table.getElementsByTagName('td');
	const f1TdLength = f1Tds.length;
	if (f1TdLength < 15) {
		const message = "It doesn't have enough F1 td. Length:";
		return new Error(message + f1TdLength);
	}

	const raceEvents: Event[] = [];
	for (let j = 0; j < 5; j++) {
		const event: Event = makeEvent(YEAR + ' F1', j, gpName, f1Tds);
		raceEvents.push(event);
	}
	const f2Title = f1Table.nextElementSibling;
	if (!(f2Title instanceof window.HTMLHeadingElement)) {
		return raceEvents;
	}

	const f2Table = f2Title.nextElementSibling;
	if (!(f2Table instanceof window.HTMLDivElement)) {
		const message = 'It is not F2 table.';
		return new Error(message);
	}
	const f2Tds = f2Table.getElementsByTagName('td');
	const f2TdLength = f2Tds.length;
	if (f2TdLength < 12) {
		const message = "It doesn't have enough F2 td. Length:";
		return new Error(message + f2TdLength);
	}
	for (let j = 0; j < 4; j++) {
		const event: Event = makeEvent(
			YEAR + ' F2',
			j,
			f2Title.textContent!,
			f2Tds,
		);
		raceEvents.push(event);
	}
	return raceEvents;
};

(async () => {
	const targetGpName = process.argv[2];
	const res = await fetch(DAZN_URL);
	const strhtml = await res.text();

	const parser = new dom.window.DOMParser();
	const doc = parser.parseFromString(strhtml, 'text/html');

	const raceEvents: Event[] = [];
	const titles = doc.getElementsByTagName('h2');

	if (!targetGpName) {
		const events = pushToEvents(titles[2], titles[2].textContent!);
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
		const startTime = String(
			Number(
				raceEvent.DateTimeStr.slice(
					raceEvent.DateTimeStr.indexOf('）') + 1,
					raceEvent.DateTimeStr.indexOf('～'),
				)
					.trim()
					.replace(':', ''),
			),
		).padStart(4, '0');
		let diff = 100;
		if (raceEvent.name.indexOf('決勝') != -1) {
			diff = 200;
		}
		const endTime = String(Number(startTime) + diff).padStart(4, '0');

		let details;
		if (raceEvent.gpName.includes(raceEvent.category)) {
			details = raceEvent.gpName;
		} else {
			details = raceEvent.category + raceEvent.gpName;
		}

		const url = `${CALENDAR_BASE_URL}&text=${raceEvent.category}${raceEvent.name}&details=${details},${raceEvent.commentators}&dates=${YEAR}${month}${date}T${startTime}00/${YEAR}${month}${date}T${endTime}00`;
		open(url);
	}
})();
