/**
 * A small, dependency-free expression evaluator for the agent's calculator tool.
 * Supports + - * / % ^, parentheses, unary signs, constants and a fixed set of functions.
 */

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
	abs: Math.abs,
	ceil: Math.ceil,
	cos: Math.cos,
	exp: Math.exp,
	floor: Math.floor,
	ln: Math.log,
	log: Math.log10,
	log2: Math.log2,
	max: Math.max,
	min: Math.min,
	round: (value, digits = 0) => {
		const factor = 10 ** digits;
		return Math.round(value * factor) / factor;
	},
	sin: Math.sin,
	sqrt: Math.sqrt,
	tan: Math.tan
};

const CONSTANTS: Record<string, number> = {
	e: Math.E,
	pi: Math.PI,
	tau: Math.PI * 2
};

type Token =
	| { kind: 'number'; value: number }
	| { kind: 'name'; value: string }
	| { kind: 'op'; value: string };

function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	const pattern = /\s*(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+|[A-Za-z_][A-Za-z0-9_]*|[-+*/%^(),])/y;
	let index = 0;

	while (index < input.length) {
		if (/\s/.test(input[index])) {
			index += 1;
			continue;
		}
		pattern.lastIndex = index;
		const match = pattern.exec(input);
		if (!match) throw new Error(`Unexpected character "${input[index]}" at position ${index + 1}`);
		const raw = match[1];
		index = pattern.lastIndex;
		if (/^\d|^\./.test(raw)) tokens.push({ kind: 'number', value: Number(raw) });
		else if (/^[A-Za-z_]/.test(raw)) tokens.push({ kind: 'name', value: raw.toLowerCase() });
		else tokens.push({ kind: 'op', value: raw });
	}

	return tokens;
}

export function evaluateExpression(expression: string): number {
	if (!expression.trim()) throw new Error('Empty expression');
	if (expression.length > 300) throw new Error('Expression is too long');

	const tokens = tokenize(expression);
	let position = 0;

	function peek(): Token | undefined {
		return tokens[position];
	}

	function takeOp(value: string): boolean {
		const token = peek();
		if (token?.kind === 'op' && token.value === value) {
			position += 1;
			return true;
		}
		return false;
	}

	function parseExpression(): number {
		let value = parseTerm();
		for (;;) {
			if (takeOp('+')) value += parseTerm();
			else if (takeOp('-')) value -= parseTerm();
			else return value;
		}
	}

	function parseTerm(): number {
		let value = parsePower();
		for (;;) {
			if (takeOp('*')) value *= parsePower();
			else if (takeOp('/')) {
				const divisor = parsePower();
				if (divisor === 0) throw new Error('Division by zero');
				value /= divisor;
			} else if (takeOp('%')) {
				const divisor = parsePower();
				if (divisor === 0) throw new Error('Division by zero');
				value %= divisor;
			} else return value;
		}
	}

	function parsePower(): number {
		const base = parseUnary();
		if (takeOp('^')) return base ** parsePower();
		return base;
	}

	function parseUnary(): number {
		if (takeOp('-')) return -parseUnary();
		if (takeOp('+')) return parseUnary();
		return parsePrimary();
	}

	function parsePrimary(): number {
		const token = peek();
		if (!token) throw new Error('Unexpected end of expression');

		if (token.kind === 'number') {
			position += 1;
			return token.value;
		}

		if (token.kind === 'name') {
			position += 1;
			const name = token.value;

			if (takeOp('(')) {
				const args: number[] = [];
				if (!takeOp(')')) {
					do {
						args.push(parseExpression());
					} while (takeOp(','));
					if (!takeOp(')')) throw new Error(`Missing ")" after ${name}(`);
				}
				const fn = FUNCTIONS[name];
				if (!fn) throw new Error(`Unknown function "${name}"`);
				return fn(...args);
			}

			if (name in CONSTANTS) return CONSTANTS[name];
			throw new Error(`Unknown value "${name}"`);
		}

		if (takeOp('(')) {
			const value = parseExpression();
			if (!takeOp(')')) throw new Error('Missing ")"');
			return value;
		}

		throw new Error(`Unexpected token "${token.value}"`);
	}

	const result = parseExpression();
	if (position !== tokens.length) {
		const token = tokens[position];
		throw new Error(`Unexpected token "${token.kind === 'op' ? token.value : token.value}"`);
	}
	if (!Number.isFinite(result)) throw new Error('Result is not a finite number');
	return result;
}
