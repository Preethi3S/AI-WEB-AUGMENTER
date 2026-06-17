import { extractSkills } from './heuristics.js';
import { parsePdfBuffer } from './pdf.js';

export async function extractResumeFromUpload(file: Express.Multer.File) {
  const text = await parsePdfBuffer(file.buffer);
  return {
    rawText: text,
    summary: text.slice(0, 500),
    skills: extractSkills(text)
  };
}

export function extractPageContext(body: {
  title?: string;
  url?: string;
  text?: string;
  selectedText?: string;
  metadata?: Record<string, string | string[]>;
}) {
  return {
    title: body.title ?? 'Untitled Page',
    url: body.url ?? '',
    text: body.text ?? '',
    selectedText: body.selectedText,
    metadata: body.metadata ?? {}
  };
}