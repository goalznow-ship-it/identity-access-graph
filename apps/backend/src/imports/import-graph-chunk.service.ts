import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ImportGraphChunkEntity } from '../database/entities'
import type { ImportedGraphNode, ImportedGraphRelationship } from './graph-conversion'

type GraphKind = 'NODE' | 'RELATIONSHIP'

@Injectable()
export class ImportGraphChunkService {
  constructor(@InjectRepository(ImportGraphChunkEntity) private readonly chunks: Repository<ImportGraphChunkEntity>) {}

  async replace(importId: string, nodes: ImportedGraphNode[], relationships: ImportedGraphRelationship[], chunkSize: number): Promise<void> {
    await this.chunks.manager.transaction(async (manager) => {
      const repository = manager.getRepository(ImportGraphChunkEntity)
      await repository.delete({ importId })
      await this.insert(repository, importId, 'NODE', nodes, chunkSize)
      await this.insert(repository, importId, 'RELATIONSHIP', relationships, chunkSize)
    })
  }

  async *read<T extends object>(importId: string, kind: GraphKind): AsyncGenerator<T[]> {
    let chunkIndex = 0
    while (true) {
      const rows = await this.chunks.find({ where: { importId, kind, chunkIndex }, take: 1 })
      if (!rows.length) return
      yield rows[0].items as T[]
      chunkIndex++
    }
  }

  async load(importId: string): Promise<{ nodes: ImportedGraphNode[]; links: ImportedGraphRelationship[] }> {
    const nodes: ImportedGraphNode[] = [], links: ImportedGraphRelationship[] = []
    for await (const chunk of this.read<ImportedGraphNode>(importId, 'NODE')) nodes.push(...chunk)
    for await (const chunk of this.read<ImportedGraphRelationship>(importId, 'RELATIONSHIP')) links.push(...chunk)
    return { nodes, links }
  }

  private async insert<T extends object>(repository: Repository<ImportGraphChunkEntity>, importId: string, kind: GraphKind, values: T[], chunkSize: number) {
    for (let start = 0, chunkIndex = 0; start < values.length; start += chunkSize, chunkIndex++) {
      const items = values.slice(start, start + chunkSize)
      await repository.save({ importId, kind, chunkIndex, itemStart: start, itemEnd: start + items.length - 1, items: items as Record<string, unknown>[] } as ImportGraphChunkEntity)
    }
  }
}
