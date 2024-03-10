import open from 'open';
import jsdom from 'jsdom';
import log4js from 'log4js';

type Event = {
	category: string;
	gpName: string;
	DateTimeStr: string;
	sessionName: string;
	commentators: string;
};

const DAZN_URL =
	'https://www.dazn.com/ja-JP/news/%E3%83%A2%E3%83%BC%E3%82%BF%E3%83%BC%E3%82%B9%E3%83%9D%E3%83%BC%E3%83%84/f1-calendar-schedule-broacast/1nyjy9o1q8esy16dsqpurlrwjs';

const CALENDAR_BASE_URL =
	'https://www.google.com/calendar/render?action=TEMPLATE';
const YEAR = '2024';

const dom = new jsdom.JSDOM();
const window = dom.window;

const logger = log4js.getLogger();
logger.level = 'all';

const getTdInnerText = (
	tds: HTMLCollectionOf<HTMLTableCellElement>,
	i: number,
): string | null => {
	return tds[i].textContent;
};

const makeEvent = (
	category: string,
	j: number,
	gpName: string,
	tds: HTMLCollectionOf<HTMLTableCellElement>,
): Event | Error => {
	const dateTimeElementText = getTdInnerText(tds, j * 3);
	if (dateTimeElementText == null) {
		return new Error("DateTime element's text is null");
	}
	const sessionNameElementText = getTdInnerText(tds, j * 3 + 1);
	if (sessionNameElementText == null) {
		return new Error("Name element's text is null");
	}
	const commentatorsElementText = getTdInnerText(tds, j * 3 + 2);
	if (commentatorsElementText == null) {
		return new Error("Commentators element's text is null");
	}
	const event: Event = {
		category: category,
		gpName: gpName
			.replaceAll(' ', '')
			.replaceAll('\n', ' ')
			.replaceAll('\t', ' '),
		DateTimeStr: dateTimeElementText
			.replaceAll(' ', '')
			.replaceAll('\n', '')
			.replaceAll('\t', ''),
		sessionName: sessionNameElementText
			.replaceAll(' ', '')
			.replaceAll('\n', ' ')
			.replaceAll('\t', ' '),
		commentators: commentatorsElementText
			.replaceAll(' ', '')
			.replaceAll('\n', ',')
			.replaceAll('\t', ''),
	};
	return event;
};

const pushToEvents = (
	title: HTMLHeadingElement,
	gpName: string,
): [undefined | Error, Event[]] => {
	// const period = title.nextElementSibling;
	// if (!(period instanceof window.HTMLParagraphElement)) {
	// 	const message = 'It is not period.';
	// 	return [new Error(message + period), []];
	// }

	const overview = title.nextElementSibling;
	if (!(overview instanceof window.HTMLHeadingElement)) {
		const message = 'It is not GP title.';
		return [new Error(message + overview), []];
	}

	const f1Table = overview.nextElementSibling;
	if (!(f1Table instanceof window.HTMLDivElement)) {
		const message = 'It is not F1 table.';
		return [new Error(message + f1Table), []];
	}
	const f1Tds = f1Table.getElementsByTagName('td');
	const f1TdLength = f1Tds.length;
	if (f1TdLength < 15) {
		const message = "It doesn't have enough F1 td. Length:";
		return [new Error(message + f1TdLength), []];
	}

	const raceEvents: Event[] = [];
	for (let j = 0; j < 5; j++) {
		const event = makeEvent(YEAR + ' F1', j, gpName, f1Tds);
		if (event instanceof Error) {
			logger.warn(`Can not make event instance. ${event.message}`);
		} else {
			raceEvents.push(event);
		}
	}
	const f2Title = f1Table.nextElementSibling;
	if (!(f2Title instanceof window.HTMLHeadingElement)) {
		return [new Error('It is not F2 title.'), raceEvents];
	}

	const f2Table = f2Title.nextElementSibling;
	if (!(f2Table instanceof window.HTMLDivElement)) {
		const message = 'It is not F2 table.';
		return [new Error(message), raceEvents];
	}
	const f2Tds = f2Table.getElementsByTagName('td');
	const f2TdLength = f2Tds.length;
	if (f2TdLength < 12) {
		const message = "It doesn't have enough F2 td. Length:";
		return [new Error(message + f2TdLength), raceEvents];
	}
	for (let j = 0; j < 4; j++) {
		const event = makeEvent(YEAR + ' F2', j, f2Title.textContent!, f2Tds);
		if (event instanceof Error) {
			logger.warn(`Can not make event instance. ${event.message}`);
		} else {
			raceEvents.push(event);
		}
	}
	return [undefined, raceEvents];
};

export const getDom = async (): Promise<Document | Error> => {
	const res = await fetch(DAZN_URL);
	if (!res.ok) {
		return new Error(`Request is failed.(${DAZN_URL})`);
	}
	logger.debug(`Request is finished.(${DAZN_URL})`);
	const strhtml = await res.text();

	const parser = new dom.window.DOMParser();
	const doc = parser.parseFromString(strhtml, 'text/html');
	logger.debug(`DOM is parsed.`);
	return doc;
};

const main = async () => {
	const targetGpName = process.argv[2];

	const doc = await getDom();
	if (doc instanceof Error) {
		logger.error(doc.message);
		return;
	}

	const raceEvents: Event[] = [];
	const titles = doc.getElementsByTagName('h2');

	if (!targetGpName) {
		const title = titles[2];
		if (title instanceof window.HTMLHeadingElement && title.textContent) {
			logger.info(`To get information about ${title.textContent}`);
			const [err, events] = pushToEvents(title, title.textContent);
			if (err instanceof Error && events.length == 0) {
				logger.error(err.message);
				return;
			} else {
				for (const e of events) {
					raceEvents.push(e);
				}
			}
		} else {
			logger.error(
				`Title does not have enough value. Element: ${title}, textContent: ${title.textContent}`,
			);
		}
	} else {
		for (const title of titles) {
			if (
				title instanceof window.HTMLHeadingElement &&
				title.textContent &&
				title.textContent.indexOf(targetGpName) != -1
			) {
				const [err, events] = pushToEvents(title, title.textContent);
				if (err instanceof Error && events.length == 0) {
					logger.error(err.message);
					return;
				} else {
					if (err instanceof Error) {
						logger.info(err.message);
					}
					for (const e of events) {
						raceEvents.push(e);
					}
				}
				break;
			}
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
		if (raceEvent.sessionName.indexOf('決勝') != -1) {
			diff = 200;
		}
		const endTime = String(Number(startTime) + diff).padStart(4, '0');

		let details;
		if (raceEvent.gpName.includes(raceEvent.category)) {
			details = raceEvent.gpName;
		} else {
			details = raceEvent.category + raceEvent.gpName;
		}

		const url = `${CALENDAR_BASE_URL}&text=${raceEvent.category}${raceEvent.sessionName}&details=${details},${raceEvent.commentators}&dates=${YEAR}${month}${date}T${startTime}00/${YEAR}${month}${date}T${endTime}00`;
		open(url);
		logger.info(url);
	}
};

if (process.env.NODE_ENV != 'test') {
	main();
}
