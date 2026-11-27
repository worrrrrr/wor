import { tool } from 'ai';
import { z } from 'zod';
import { evaluateExpression } from '../calculator.ts';

export const calculateTool = tool({
	description:
		'Evaluate an arithmetic expression exactly. Use this for any calculation instead of doing mental math. Supports + - * / % ^, parentheses, sqrt, abs, round, floor, ceil, sin, cos, tan, log, ln, exp, min, max, pi and e.',
	inputSchema: z.object({
		expression: z
			.string()
			.describe('The expression, for example "(17 * 23 + 9) / 4" or "sqrt(144)"')
	}),
	execute: async ({ expression }) => {
		const result = evaluateExpression(expression);
		return { expression, result };
	}
});
