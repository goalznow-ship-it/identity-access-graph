export default () => ({
  port: parseInt(process.env.PORT ?? '', 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
    connectTimeoutMs: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS || 5000),
    poolSize: Number(process.env.DATABASE_POOL_SIZE || 10),
  },
  neo4j: {
    enabled: (process.env.NEO4J_ENABLED ?? 'false').toLowerCase() === 'true',
    database: process.env.NEO4J_DATABASE || 'neo4j',
    encrypted: (process.env.NEO4J_ENCRYPTED ?? 'true').toLowerCase() !== 'false',
    queryTimeoutMs: Number(process.env.NEO4J_QUERY_TIMEOUT_MS || 30000),
  },

})
