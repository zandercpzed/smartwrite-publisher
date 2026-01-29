import { describe, it, expect } from 'vitest';
import { MarkdownConverter } from './converter';

describe('MarkdownConverter', () => {
	const converter = new MarkdownConverter();

	describe('convert - main conversion method', () => {
		it('should convert basic markdown to HTML', () => {
			const markdown = '# Title\n\nThis is a paragraph.';
			const result = converter.convert(markdown);

			expect(result.title).toBe('Title');
			expect(result.html).toContain('<p>This is a paragraph.</p>');
		});

		it('should extract title from frontmatter', () => {
			const markdown = '---\ntitle: My Post\n---\n\nContent here';
			const result = converter.convert(markdown);

			expect(result.title).toBe('My Post');
		});

		it('should use fallback title when none provided', () => {
			const markdown = 'Just content, no heading';
			const result = converter.convert(markdown, 'Default Title');

			expect(result.title).toBe('Default Title');
		});

		it('should extract subtitle from frontmatter', () => {
			const markdown = '---\ntitle: Post\nsubtitle: My Subtitle\n---\n\nContent';
			const result = converter.convert(markdown);

			expect(result.subtitle).toBe('My Subtitle');
		});

		it('should extract tags from frontmatter array', () => {
			const markdown = '---\ntitle: Post\ntags: [javascript, nodejs]\n---\n\nContent';
			const result = converter.convert(markdown);

			expect(result.tags).toEqual(['javascript', 'nodejs']);
		});

		it('should handle missing frontmatter', () => {
			const markdown = '# Title\n\nContent';
			const result = converter.convert(markdown);

			expect(result.html).not.toContain('---');
		});
	});

	describe('Heading conversion', () => {
		it('should convert H2 headings', () => {
			const result = converter.convert('## Heading 2');
			expect(result.html).toContain('<h2>Heading 2</h2>');
		});

		it('should convert H3-H6 headings', () => {
			const markdown = '### H3\n#### H4\n##### H5\n###### H6';
			const result = converter.convert(markdown);

			expect(result.html).toContain('<h3>H3</h3>');
			expect(result.html).toContain('<h4>H4</h4>');
			expect(result.html).toContain('<h5>H5</h5>');
			expect(result.html).toContain('<h6>H6</h6>');
		});

		it('should remove H1 heading from body (used as title)', () => {
			const result = converter.convert('# Title\n\n## Subtitle');

			expect(result.html).not.toContain('<h1>');
			expect(result.html).toContain('<h2>Subtitle</h2>');
		});
	});

	describe('Text formatting', () => {
		it('should convert bold text', () => {
			const result = converter.convert('**bold text**');
			expect(result.html).toContain('<strong>bold text</strong>');
		});

		it('should convert italic text', () => {
			const result = converter.convert('*italic text*');
			expect(result.html).toContain('<em>italic text</em>');
		});

		it('should convert bold italic text', () => {
			const result = converter.convert('***bold italic***');
			expect(result.html).toContain('<strong><em>bold italic</em></strong>');
		});

		it('should convert strikethrough', () => {
			const result = converter.convert('~~strikethrough~~');
			expect(result.html).toContain('<del>strikethrough</del>');
		});

		it('should handle underscore bold/italic variants', () => {
			const markdown = '__bold__ _italic_ ___bold italic___';
			const result = converter.convert(markdown);

			expect(result.html).toContain('<strong>bold</strong>');
			expect(result.html).toContain('<em>italic</em>');
			expect(result.html).toContain('<strong><em>bold italic</em></strong>');
		});
	});

	describe('Links and images', () => {
		it('should convert markdown links', () => {
			const result = converter.convert('[Google](https://google.com)');
			expect(result.html).toContain('<a href="https://google.com">Google</a>');
		});

		it('should convert images', () => {
			const result = converter.convert('![alt text](https://example.com/image.png)');
			expect(result.html).toContain('<img src="https://example.com/image.png" alt="alt text" />');
		});

		it('should convert Obsidian wiki links to plain text', () => {
			const result = converter.convert('[[Note Name]]');
			expect(result.html).toContain('Note Name');
			expect(result.html).not.toContain('<a');
		});

		it('should convert Obsidian wiki links with aliases', () => {
			const result = converter.convert('[[Note|Alias Text]]');
			expect(result.html).toContain('Alias Text');
		});
	});

	describe('Code blocks', () => {
		it('should convert inline code', () => {
			const result = converter.convert('This is `inline code` here');
			expect(result.html).toContain('<code>inline code</code>');
		});

		it('should convert code blocks', () => {
			const markdown = '```\nconst x = 1;\n```';
			const result = converter.convert(markdown);
			expect(result.html).toContain('<pre><code>');
			expect(result.html).toContain('const x = 1;');
		});

		it('should preserve language tag in code blocks', () => {
			const markdown = '```javascript\nconst x = 1;\n```';
			const result = converter.convert(markdown);
			expect(result.html).toContain('class="language-javascript"');
		});
	});

	describe('Lists', () => {
		it('should convert unordered lists', () => {
			const markdown = '- Item 1\n- Item 2\n- Item 3';
			const result = converter.convert(markdown);

			expect(result.html).toContain('<ul>');
			expect(result.html).toContain('<li>Item 1</li>');
			expect(result.html).toContain('<li>Item 2</li>');
			expect(result.html).toContain('<li>Item 3</li>');
			expect(result.html).toContain('</ul>');
		});

		it('should convert ordered lists', () => {
			const markdown = '1. First\n2. Second\n3. Third';
			const result = converter.convert(markdown);

			expect(result.html).toContain('<ol>');
			expect(result.html).toContain('<li>First</li>');
			expect(result.html).toContain('<li>Second</li>');
			expect(result.html).toContain('<li>Third</li>');
			expect(result.html).toContain('</ol>');
		});

		it('should handle mixed list markers', () => {
			const markdown = '- Item 1\n+ Item 2\n* Item 3';
			const result = converter.convert(markdown);

			expect(result.html).toContain('<li>Item 1</li>');
			expect(result.html).toContain('<li>Item 2</li>');
			expect(result.html).toContain('<li>Item 3</li>');
		});
	});

	describe('Blockquotes', () => {
		it('should convert blockquotes', () => {
			const markdown = '> This is a quote';
			const result = converter.convert(markdown);
			expect(result.html).toContain('<blockquote>');
			expect(result.html).toContain('This is a quote');
		});

		it('should convert Obsidian callouts', () => {
			const markdown = '> [!note] Title\n> Content line 1\n> Content line 2';
			const result = converter.convert(markdown);

			expect(result.html).toContain('<blockquote>');
			expect(result.html).toContain('Title');
			expect(result.html).toContain('Content line 1');
		});

		it('should handle callouts without title', () => {
			const markdown = '> [!warning]\n> Be careful';
			const result = converter.convert(markdown);
			expect(result.html).toContain('<blockquote>');
			expect(result.html).toContain('Be careful');
		});
	});

	describe('Paragraphs', () => {
		it('should wrap plain text in paragraphs', () => {
			const result = converter.convert('Plain text paragraph');
			expect(result.html).toContain('<p>Plain text paragraph</p>');
		});

		it('should create separate paragraphs for blank lines', () => {
			const markdown = 'First paragraph\n\nSecond paragraph';
			const result = converter.convert(markdown);

			expect(result.html).toContain('<p>First paragraph</p>');
			expect(result.html).toContain('<p>Second paragraph</p>');
		});

		it('should not wrap block elements in paragraphs', () => {
			const markdown = '# Title\n\n<h2>Heading</h2>\n\nParagraph';
			const result = converter.convert(markdown);

			expect(result.html).not.toContain('<p><h2>');
		});
	});

	describe('Horizontal rules', () => {
		it('should convert horizontal rules', () => {
			const result = converter.convert('---');
			expect(result.html).toContain('<hr />');
		});

		it('should handle multiple dashes for horizontal rules', () => {
			const markdown = '---\n---\n---';
			const result = converter.convert(markdown);

			// Count the number of <hr /> tags
			const hrCount = (result.html.match(/<hr \/>/g) || []).length;
			expect(hrCount).toBeGreaterThan(0);
		});
	});

	describe('Complex documents', () => {
		it('should handle real-world document structure', () => {
			const markdown = `---
title: My Article
subtitle: A Deep Dive
tags: [tech, tutorial]
---

## Introduction

This is the **introduction** with some *emphasis*.

- Point 1
- Point 2

### Code Example

\`\`\`javascript
function example() {
  return true;
}
\`\`\`

> [!tip] Remember
> Always test your code

Final paragraph with a [link](https://example.com).`;

			const result = converter.convert(markdown);

			expect(result.title).toBe('My Article');
			expect(result.subtitle).toBe('A Deep Dive');
			expect(result.tags).toEqual(['tech', 'tutorial']);
			expect(result.html).toContain('<h2>Introduction</h2>');
			expect(result.html).toContain('<strong>introduction</strong>');
			expect(result.html).toContain('<ul>');
			expect(result.html).toContain('language-javascript');
			expect(result.html).toContain('<blockquote>');
		});

		it('should preserve HTML entities', () => {
			const markdown = 'Test & check < greater';
			const result = converter.convert(markdown);

			expect(result.html).toContain('&amp;');
			expect(result.html).toContain('&lt;');
		});
	});

	describe('Edge cases', () => {
		it('should handle empty string', () => {
			const result = converter.convert('');
			expect(result.title).toBe('Sem título');
			expect(result.html).toBe('');
		});

		it('should handle only whitespace', () => {
			const result = converter.convert('   \n\n   ');
			expect(result.html.trim()).toBe('');
		});

		it('should handle multiple consecutive blank lines', () => {
			const markdown = 'Para 1\n\n\n\n\nPara 2';
			const result = converter.convert(markdown);

			expect(result.html).toContain('<p>Para 1</p>');
			expect(result.html).toContain('<p>Para 2</p>');
		});

		it('should handle nested formatting', () => {
			const markdown = '***__test__***';
			const result = converter.convert(markdown);
			expect(result.html).toContain('<strong><em>');
		});
	});
});
