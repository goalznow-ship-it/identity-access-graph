import * as fs from 'node:fs'
import * as path from 'node:path'
import { IMPORT_CONFIG } from './import-config'

export const SOURCE_FILE_MISSING = 'SOURCE_FILE_MISSING'
export const SOURCE_FILE_UNAVAILABLE_MESSAGE = 'The uploaded source file is no longer available. Please upload the file again.'

export class ImportSourceError extends Error {
  constructor(public readonly code: string, message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'ImportSourceError'
  }
}

export function safeImportSourceName(filePath: string): string {
  return path.basename(filePath).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255)
}

export async function requireReadableImportSource(filePath: string): Promise<string> {
  const root = path.resolve(IMPORT_CONFIG.uploadDir)
  const candidate = path.resolve(filePath)
  const relative = path.relative(root, candidate)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ImportSourceError('SOURCE_PATH_INVALID', 'The uploaded source file path is invalid.')
  }
  try {
    await fs.promises.access(candidate, fs.constants.R_OK)
    const [realRoot, realCandidate] = await Promise.all([fs.promises.realpath(root), fs.promises.realpath(candidate)])
    const realRelative = path.relative(realRoot, realCandidate)
    if (!realRelative || realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
      throw new ImportSourceError('SOURCE_PATH_INVALID', 'The uploaded source file path is invalid.')
    }
    const stat = await fs.promises.stat(realCandidate)
    if (!stat.isFile()) throw new ImportSourceError('SOURCE_FILE_UNREADABLE', 'The uploaded source is not a readable file.')
    return realCandidate
  } catch (error) {
    if (error instanceof ImportSourceError) throw error
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') throw new ImportSourceError(SOURCE_FILE_MISSING, SOURCE_FILE_UNAVAILABLE_MESSAGE, error)
    if (code === 'EACCES' || code === 'EPERM') throw new ImportSourceError('SOURCE_FILE_UNREADABLE', 'The uploaded source file cannot be read.', error)
    throw new ImportSourceError('SOURCE_FILE_UNREADABLE', 'The uploaded source file cannot be read.', error)
  }
}

export function structuredImportError(error: unknown): { code: string; message: string } {
  if (error instanceof ImportSourceError) return { code: error.code, message: error.message }
  return { code: 'IMPORT_PROCESSING_FAILED', message: error instanceof Error ? error.message : 'Import processing failed.' }
}
