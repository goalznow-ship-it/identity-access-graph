export const GRAPH_CONSTRAINTS=[
  'CREATE CONSTRAINT graph_node_id IF NOT EXISTS FOR (n:GraphNode) REQUIRE n.id IS UNIQUE',
  'CREATE CONSTRAINT graph_object_guid IF NOT EXISTS FOR (n:GraphNode) REQUIRE n.objectGUID IS UNIQUE',
  'CREATE CONSTRAINT graph_sid IF NOT EXISTS FOR (n:GraphNode) REQUIRE n.sid IS UNIQUE',
  'CREATE CONSTRAINT graph_source_identity IF NOT EXISTS FOR (n:GraphNode) REQUIRE (n.sourceSystem, n.sourceId) IS UNIQUE',
] as const
