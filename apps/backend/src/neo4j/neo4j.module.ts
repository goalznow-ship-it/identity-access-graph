import { Global, Module } from '@nestjs/common'; import { Neo4jService } from './neo4j.service'; import { Neo4jHealthController } from './neo4j.health'; import { GraphSchemaService } from './schema'
@Global() @Module({providers:[Neo4jService,GraphSchemaService],controllers:[Neo4jHealthController],exports:[Neo4jService,GraphSchemaService]}) export class Neo4jModule{}
