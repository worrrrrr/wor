import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { tool } from 'ai';
import { z } from 'zod';

/**
 * Astrology tool. Numbers come from the local astro skill, which uses Swiss
 * Ephemeris (JPL DE431) when installed and a VSOP87D fallback otherwise.
 * Nothing here guesses a position.
 */

const SIGNS = [
	'Aries',
	'Taurus',
	'Gemini',
	'Cancer',
	'Leo',
	'Virgo',
	'Libra',
	'Scorpio',
	'Sagittarius',
	'Capricorn',
	'Aquarius',
	'Pisces'
] as const;

type Body = {
	body: string;
	longitude: number;
	sign: string;
	degree_in_sign: number;
	retrograde?: boolean;
	house?: number;
};

type Aspect = { a: string; b: string; aspect: string; angle: number; orb: number };

type AstroChart = {
	birth: {
		local: string;
		city: string;
		lat: number;
		lon: number;
		utc_offset: number;
		jd_ut: number;
		ayanamsa: number;
	};
	engine: {
		backend: string;
		ephemeris: string;
		house_system: string;
		ayanamsa_model: string;
	};
	western: {
		ascendant: number;
		midheaven: number;
		vertex: number;
		house_system: string;
		bodies: Body[];
		houses?: number[];
		aspects: Aspect[];
	};
	vedic: {
		moon_sidereal: number;
		nakshatra: string;
		pada: number;
		ayanamsa: number;
		ayanamsa_model: string;
		bodies: Array<{
			body: string;
			sidereal: number;
			rashi: string;
			degree_in_rashi: number;
		}>;
		vimshottari?: {
			system: string;
			birth_nakshatra_lord: string;
			balance_years: number;
			periods: Array<{ lord: string; start: string; end: string; years: number }>;
		};
		sade_sati?: unknown;
	};
	bazi: {
		year: string;
		month: string;
		day: string;
		hour: string;
		hidden: Record<string, string[]>;
		elements: Record<string, number>;
		luck?: Record<string, unknown>;
		nayin?: Record<string, unknown>;
		stars?: unknown;
		strength?: {
			score: number;
			band: string;
			day_master: string;
			day_master_element: string;
			month_relation: string;
			favorable_elements: string[];
		};
		minor_luck?: unknown;
	};
	human_design?: {
		type: string;
		authority: string;
		profile: string;
		definition: string;
		defined_centers: string[];
		open_centers: string[];
		channels: unknown[];
		cross_name: string;
	};
	not_computed?: string[];
};

function signFromLongitude(longitude: number): string {
	const normalized = ((longitude % 360) + 360) % 360;
	return SIGNS[Math.floor(normalized / 30)] ?? SIGNS[0];
}

function degreeFromLongitude(longitude: number): number {
	const normalized = ((longitude % 360) + 360) % 360;
	return normalized % 30;
}

function title(value: string): string {
	return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function bodyLine(body: Body): string {
	const retrograde = body.retrograde ? ' retrograde' : '';
	const house = body.house ? `, house ${body.house}` : '';
	return `${title(body.body)} ${body.degree_in_sign.toFixed(2)}° ${body.sign}${retrograde}${house}`;
}

function formatSummary(chart: AstroChart): string {
	const lines: string[] = [];
	const asc = `${degreeFromLongitude(chart.western.ascendant).toFixed(2)}° ${signFromLongitude(chart.western.ascendant)}`;
	const mc = `${degreeFromLongitude(chart.western.midheaven).toFixed(2)}° ${signFromLongitude(chart.western.midheaven)}`;

	lines.push(
		`Natal chart for ${chart.birth.local} in ${chart.birth.city} (UTC${chart.birth.utc_offset >= 0 ? '+' : ''}${chart.birth.utc_offset}).`
	);
	lines.push(`Engine: ${chart.engine.backend}; ${chart.engine.house_system} houses.`);
	lines.push(`Ascendant ${asc}. Midheaven ${mc}.`);
	lines.push('');
	lines.push('Western positions:');
	for (const body of chart.western.bodies) lines.push(`- ${bodyLine(body)}`);

	const aspects = [...chart.western.aspects]
		.sort((a, b) => Math.abs(a.orb) - Math.abs(b.orb))
		.slice(0, 12);
	if (aspects.length) {
		lines.push('');
		lines.push('Closest aspects:');
		for (const aspect of aspects) {
			lines.push(
				`- ${title(aspect.a)} ${aspect.aspect} ${title(aspect.b)} (orb ${Math.abs(aspect.orb).toFixed(2)}°)`
			);
		}
	}

	lines.push('');
	lines.push(
		`Vedic: Moon in ${chart.vedic.nakshatra}, pada ${chart.vedic.pada}; ayanamsa ${chart.vedic.ayanamsa_model} ${chart.vedic.ayanamsa.toFixed(4)}°.`
	);
	if (chart.vedic.vimshottari) {
		const periods = chart.vedic.vimshottari.periods;
		const current = periods.find(
			(period) => Date.now() >= Date.parse(period.start) && Date.now() < Date.parse(period.end)
		);
		if (current) {
			lines.push(
				`Current Vimshottari period: ${current.lord} (${current.start.slice(0, 10)} to ${current.end.slice(0, 10)}).`
			);
		}
	}

	lines.push(
		`BaZi pillars: year ${chart.bazi.year}, month ${chart.bazi.month}, day ${chart.bazi.day}, hour ${chart.bazi.hour}.`
	);
	if (chart.bazi.strength) {
		lines.push(
			`BaZi strength: ${chart.bazi.strength.band} (${chart.bazi.strength.score.toFixed(2)}), day master ${chart.bazi.strength.day_master} (${chart.bazi.strength.day_master_element}); favorable: ${chart.bazi.strength.favorable_elements.join(', ')}.`
		);
	}
	lines.push(
		`Elements: ${Object.entries(chart.bazi.elements)
			.map(([element, count]) => `${element} ${count}`)
			.join(', ')}.`
	);

	if (chart.human_design) {
		lines.push('');
		lines.push(
			`Human Design: ${chart.human_design.type}, ${chart.human_design.authority} authority, profile ${chart.human_design.profile}, ${chart.human_design.definition} definition.`
		);
		lines.push(
			`Defined centers: ${chart.human_design.defined_centers.join(', ') || 'none'}. Open: ${chart.human_design.open_centers.join(', ') || 'none'}.`
		);
	}

	if (chart.not_computed?.length) lines.push(`Not computed: ${chart.not_computed.join(', ')}.`);
	return lines.join('\n');
}

const SCRIPT =
	process.env.ASTRO_SCRIPT || join(homedir(), 'skills', 'astro', 'scripts', 'astro.py');

function runAstro(args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		const commands = process.env.PYTHON ? [process.env.PYTHON] : ['python', 'python3'];

		const attempt = (index: number) => {
			if (index >= commands.length) {
				reject(
					new Error(
						'Python was not found. Install Python and pyswisseph (python -m pip install pyswisseph).'
					)
				);
				return;
			}
			execFile(
				commands[index],
				args,
				{ timeout: 30_000, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8', windowsHide: true },
				(error, stdout, stderr) => {
					if (!error) {
						resolve(stdout);
						return;
					}
					const code = (error as NodeJS.ErrnoException).code;
					if (code === 'ENOENT') {
						attempt(index + 1);
						return;
					}
					const detail = String(stderr || '').trim() || error.message;
					reject(new Error(detail));
				}
			);
		};

		attempt(0);
	});
}

export const astrologyTool = tool({
	description:
		'Cast a real natal chart from a birth date, time, and city. Returns Western positions and houses, the ascendant, aspects, Vedic nakshatra and Vimshottari period, BaZi four pillars with element strength, and Human Design. Use this for any astrology, birth chart, BaZi, or Human Design question instead of guessing. Numbers come from Swiss Ephemeris (JPL) when available.',
	inputSchema: z.object({
		date: z
			.string()
			.describe(
				'Birth date as YYYY-MM-DD or D/M/YYYY. Buddhist years such as 8/8/2535 are accepted.'
			),
		time: z.string().describe('Birth time in 24-hour HH:MM, for example "16:49"'),
		location: z.string().describe('Birth city, for example "Bangkok" or "Yala"'),
		focus: z
			.enum(['overview', 'western', 'vedic', 'bazi', 'human_design'])
			.default('overview')
			.describe('Which part of the chart to return in full. Overview gives a compact summary.')
	}),
	execute: async ({ date, time, location, focus }) => {
		const cleanDate = date.trim();
		const cleanTime = time.trim();
		const cleanLocation = location.replace(/\s+/g, ' ').trim();

		if (!/^[\d./-]{6,24}$/.test(cleanDate)) {
			throw new Error('Date must look like YYYY-MM-DD or D/M/YYYY.');
		}
		if (!/^\d{1,2}[:.]\d{2}$/.test(cleanTime)) {
			throw new Error('Time must look like HH:MM.');
		}
		if (!cleanLocation || cleanLocation.length > 80) {
			throw new Error('Location must be a city name between 1 and 80 characters.');
		}
		if (!existsSync(SCRIPT)) {
			throw new Error(
				`Astro engine not found at ${SCRIPT}. Install the astro skill or set ASTRO_SCRIPT.`
			);
		}

		const stdout = await runAstro([SCRIPT, cleanDate, cleanTime, cleanLocation, '--json']);
		let chart: AstroChart;
		try {
			chart = JSON.parse(stdout) as AstroChart;
		} catch {
			throw new Error(
				`The astro engine returned unreadable output: ${stdout.slice(0, 300).trim()}`
			);
		}

		const result: Record<string, unknown> = {
			summary: formatSummary(chart),
			birth: chart.birth,
			engine: chart.engine,
			positions: chart.western.bodies.map((body) => ({
				body: body.body,
				sign: body.sign,
				degree: Number(body.degree_in_sign.toFixed(4)),
				house: body.house ?? null,
				retrograde: Boolean(body.retrograde)
			})),
			ascendant: `${degreeFromLongitude(chart.western.ascendant).toFixed(4)}° ${signFromLongitude(chart.western.ascendant)}`,
			midheaven: `${degreeFromLongitude(chart.western.midheaven).toFixed(4)}° ${signFromLongitude(chart.western.midheaven)}`,
			vedic: {
				nakshatra: chart.vedic.nakshatra,
				pada: chart.vedic.pada,
				ayanamsa: chart.vedic.ayanamsa,
				ayanamsa_model: chart.vedic.ayanamsa_model
			},
			bazi: {
				year: chart.bazi.year,
				month: chart.bazi.month,
				day: chart.bazi.day,
				hour: chart.bazi.hour,
				elements: chart.bazi.elements,
				strength: chart.bazi.strength ?? null
			},
			human_design: chart.human_design ?? null
		};

		if (focus === 'western' || focus === 'overview') {
			result.aspects = chart.western.aspects;
			result.houses = chart.western.houses ?? null;
		}
		if (focus === 'vedic') {
			result.vedic_bodies = chart.vedic.bodies;
			result.vimshottari = chart.vedic.vimshottari ?? null;
			result.sade_sati = chart.vedic.sade_sati ?? null;
		}
		if (focus === 'bazi') {
			result.bazi_detail = {
				hidden: chart.bazi.hidden,
				luck: chart.bazi.luck,
				nayin: chart.bazi.nayin,
				stars: chart.bazi.stars,
				minor_luck: chart.bazi.minor_luck
			};
		}
		if (focus === 'human_design') {
			result.human_design_detail = chart.human_design ?? null;
		}

		return result;
	}
});
