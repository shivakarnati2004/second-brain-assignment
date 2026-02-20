import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import formidable, { type Fields, type Files, type File } from 'formidable';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { requireSessionUser } from '@/lib/auth';
import { extractMetadataFromContent, extractTextFromImage } from '@/lib/gemini';
import type { UploadExtractionResult } from '@/types';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_EXTRACTED_CHARS = 12000;
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
  const form = formidable({
    multiples: false,
    maxFileSize: MAX_UPLOAD_SIZE,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
}

function normalizeFile(files: Files): File | null {
  const maybeFile = files.file;
  if (!maybeFile) return null;
  return Array.isArray(maybeFile) ? maybeFile[0] : maybeFile;
}

function inferTypeFromFile(fileName: string): 'note' | 'link' | 'insight' | 'article' {
  const lowered = fileName.toLowerCase();
  if (lowered.endsWith('.pdf') || lowered.endsWith('.doc') || lowered.endsWith('.docx')) return 'article';
  if (lowered.includes('insight')) return 'insight';
  return 'note';
}

async function extractText(file: File): Promise<string> {
  const filePath = file.filepath;
  const mimeType = file.mimetype || '';
  const ext = path.extname(file.originalFilename || '').toLowerCase();
  const data = await fs.readFile(filePath);

  if (mimeType.startsWith('image/')) {
    return extractTextFromImage(data, mimeType);
  }

  if (mimeType === 'application/pdf' || ext === '.pdf') {
    const parsed = await pdfParse(data);
    return parsed.text || '';
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    const parsed = await mammoth.extractRawText({ buffer: data });
    return parsed.value || '';
  }

  if (
    mimeType.startsWith('text/') ||
    ['.txt', '.md', '.markdown', '.json', '.csv', '.log'].includes(ext)
  ) {
    return data.toString('utf8');
  }

  throw new Error('Unsupported file type. Supported: PDF, DOCX, TXT/MD, CSV/JSON, and images.');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireSessionUser(req, res);
  if (!user) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files } = await parseForm(req);
    const file = normalizeFile(files);

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = file.originalFilename || 'Uploaded Document';
    const extractedRaw = (await extractText(file)).trim();

    if (!extractedRaw) {
      return res.status(400).json({ error: 'No readable content found in file' });
    }

    const content = extractedRaw.slice(0, MAX_EXTRACTED_CHARS);

    let ai: Awaited<ReturnType<typeof extractMetadataFromContent>> = {
      title: fileName,
      summary: '',
      tags: [],
      source_name: fileName,
      suggestedType: inferTypeFromFile(fileName),
    };

    try {
      ai = await extractMetadataFromContent(fileName, content);
    } catch {
      // Graceful fallback: keep extracted content even when AI metadata extraction is unavailable.
    }

    const result: UploadExtractionResult = {
      title: ai.title || fileName,
      content,
      tags: ai.tags,
      suggestedType: ai.suggestedType || inferTypeFromFile(fileName),
      source_name: ai.source_name || fileName,
      summary: ai.summary,
      metadata: {
        file_name: fileName,
        mime_type: file.mimetype || 'unknown',
        file_size_bytes: String(file.size || 0),
      },
    };

    return res.status(200).json({ data: result });
  } catch (err: any) {
    const message = err?.message || 'Upload processing failed';
    const status = message.toLowerCase().includes('unsupported file type') || message.toLowerCase().includes('no readable content')
      ? 400
      : 500;
    return res.status(status).json({ error: message });
  }
}
