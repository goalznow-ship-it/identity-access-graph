import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ImportRowChunkEntity } from '../database/entities'

@Injectable()
export class ImportChunkService {
  constructor(@InjectRepository(ImportRowChunkEntity) private readonly chunks: Repository<ImportRowChunkEntity>) {}
  async append(importId: string, fileId: string, sheetIndex: number, chunkIndex: number, rowStart: number, rows: Record<string, unknown>[]) {
    await this.chunks.upsert({ importId, fileId, sheetIndex, chunkIndex, rowStart, rowEnd: rowStart + rows.length - 1, rows } as any, ['importId', 'fileId', 'sheetIndex', 'chunkIndex'])
  }
  async rows(importId: string, fileId: string, sheetIndex: number) {
    const chunks = await this.chunks.find({ where: { importId, fileId, sheetIndex }, order: { chunkIndex: 'ASC' } })
    return chunks.flatMap((chunk) => chunk.rows)
  }
  async lastCheckpoint(importId: string, fileId: string, sheetIndex: number) {
    const [last] = await this.chunks.find({ where: { importId, fileId, sheetIndex }, order: { chunkIndex: 'DESC' }, take: 1 })
    return last ? { chunkIndex: last.chunkIndex, rowEnd: last.rowEnd } : { chunkIndex: -1, rowEnd: 0 }
  }
  deleteFile(importId: string, fileId: string) { return this.chunks.delete({ importId, fileId }) }
}
