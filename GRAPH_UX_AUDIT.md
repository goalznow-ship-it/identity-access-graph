# Graph UX audit

Implemented:
- Larger node shapes, icons, badges, and readable labels.
- Labels become visible at practical zoom levels.
- Increased pointer hit area and directional arrows.
- Node-only imports now use a deterministic inventory grid instead of scattered force nodes.
- Added an explicit Node Inventory Mode explanation when a dataset has zero relationships.
- Added direct actions to import relationship datasets or open the connected demo graph.
- Disabled dragging and long force simulation for zero-relationship datasets.
- Removed environment-specific package lock files so npm regenerates them from the user's configured public registry.

Important data rule:
- The application does not fabricate relationships. Attack paths and blast-radius analysis require relationship datasets such as group membership, access grants, ownership, dependencies, role assignments, SSH/sudo access, or application/database mappings.
