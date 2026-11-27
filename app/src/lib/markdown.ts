import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('css', css);
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('go', go);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('php', php);
hljs.registerLanguage('python', python);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);

const ALIASES: Record<string, string> = {
	js: 'javascript',
	jsx: 'javascript',
	node: 'javascript',
	ts: 'typescript',
	tsx: 'typescript',
	py: 'python',
	sh: 'bash',
	shell: 'bash',
	zsh: 'bash',
	yml: 'yaml',
	html: 'xml',
	svelte: 'xml',
	vue: 'xml',
	svg: 'xml',
	cs: 'csharp',
	md: 'markdown',
	'c++': 'cpp',
	h: 'c',
	jsonc: 'json'
};

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

const marked = new Marked({ gfm: true, breaks: true });

marked.use({
	renderer: {
		code({ text, lang }) {
			const rawLanguage = (lang || '').trim().split(/\s+/)[0].toLowerCase();
			const language = ALIASES[rawLanguage] || rawLanguage;
			const known = language && hljs.getLanguage(language) ? language : '';
			const label = known || rawLanguage || 'code';
			return `<div class="code-block" data-lang="${escapeHtml(label)}"><div class="code-head"><span class="code-lang">${escapeHtml(label)}</span><button type="button" class="code-copy" data-copy aria-label="Copy code">Copy</button></div><pre><code class="${known ? `language-${known}` : ''}" data-code="${escapeHtml(text)}">${escapeHtml(text)}</code></pre></div>`;
		},
		link({ href, title, tokens }) {
			const text = this.parser.parseInline(tokens);
			const safeHref = escapeHtml(href || '#');
			const safeTitle = title ? ` title="${escapeHtml(title)}"` : '';
			return `<a href="${safeHref}"${safeTitle} target="_blank" rel="noopener noreferrer">${text}</a>`;
		}
	}
});

export function renderMarkdown(source: string, highlight = true): string {
	const html = marked.parse(source) as string;
	const clean = DOMPurify.sanitize(html, {
		ADD_ATTR: ['target', 'data-lang', 'data-copy', 'data-code']
	});
	if (!highlight) return clean;

	const template = document.createElement('template');
	template.innerHTML = clean;
	for (const code of template.content.querySelectorAll('pre code')) {
		const language = code.parentElement?.parentElement?.getAttribute('data-lang') || '';
		try {
			if (language && hljs.getLanguage(language)) {
				const result = hljs.highlight(code.textContent || '', { language });
				code.innerHTML = result.value;
				code.classList.add('hljs');
			}
		} catch {
			// Leave the block plain if highlighting fails.
		}
	}
	return template.innerHTML;
}
