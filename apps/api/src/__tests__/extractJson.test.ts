import { describe, it, expect } from 'vitest';

// Inline the extractJson function for testing since it's not exported
function extractJson(text: string): string {
  const mdBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdBlock) {
    const trimmed = mdBlock[1]!.trim();
    try { JSON.parse(trimmed); return trimmed; } catch {}
  }

  const firstBrace = text.indexOf('{');
  if (firstBrace >= 0) {
    let depth = 0;
    for (let i = firstBrace; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(firstBrace, i + 1);
          try { JSON.parse(candidate); return candidate; } catch { break; }
        }
      }
    }
  }

  const firstBracket = text.indexOf('[');
  if (firstBracket >= 0) {
    let depth = 0;
    for (let i = firstBracket; i < text.length; i++) {
      if (text[i] === '[') depth++;
      else if (text[i] === ']') {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(firstBracket, i + 1);
          try { JSON.parse(candidate); return candidate; } catch { break; }
        }
      }
    }
  }

  return text;
}

describe('extractJson', () => {
  it('extracts JSON from markdown code block', () => {
    const text = 'Here is the result:\n```json\n{"key": "value"}\n```\nEnd.';
    expect(extractJson(text)).toBe('{"key": "value"}');
  });

  it('extracts JSON from plain markdown code block without json tag', () => {
    const text = '```\n{"key": "value"}\n```';
    expect(extractJson(text)).toBe('{"key": "value"}');
  });

  it('extracts JSON from text with surrounding content using balanced braces', () => {
    const text = 'Some text before {"key": "value"} some after';
    expect(extractJson(text)).toBe('{"key": "value"}');
  });

  it('handles nested objects', () => {
    const text = 'Result: {"outer": {"inner": 1}} thanks';
    expect(extractJson(text)).toBe('{"outer": {"inner": 1}}');
  });

  it('extracts JSON array from markdown', () => {
    const text = '```json\n[{"title": "Role1"}, {"title": "Role2"}]\n```';
    expect(extractJson(text)).toBe('[{"title": "Role1"}, {"title": "Role2"}]');
  });

  it('returns full text when no JSON found', () => {
    const text = 'Just a regular response without JSON';
    expect(extractJson(text)).toBe(text);
  });

  it('prefers markdown block over inline JSON', () => {
    const text = '```json\n{"from": "block"}\n```\n{"from": "inline"}';
    expect(extractJson(text)).toBe('{"from": "block"}');
  });
});
