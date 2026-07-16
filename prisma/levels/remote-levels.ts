// Additional real, playable levels for the reserved remote-only number band
// (`number >= 1000`, per `backend-poc-arrow/docs/DYNAMIC_LEVELS_CONTRACT.md`).
// These are downloaded by the frontend as dynamic/extra content on top of the
// local levels 1-30; they never overwrite or renumber existing rows.
//
// Unlike `manual-levels.ts`'s `buildLevel`, these definitions are authored
// directly (no shared grid-builder) since remote levels are few and include
// a 3D case (non-zero `z`, `metadata.mode: '3d'`) that the 2D-only builder
// does not support.

export type RemoteLevelSeed = {
  number: number;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  definitionJson: {
    nodes: Array<{ id: string; x: number; y: number; z?: number }>;
    edges: Array<{
      id: string;
      fromNodeId: string;
      toNodeId: string;
      direction: 'up' | 'right' | 'down' | 'left' | 'above' | 'below';
    }>;
    arrows: Array<{
      id: string;
      occupiedEdges: string[];
      startNodeId: string;
      endNodeId: string;
      direction: 'up' | 'right' | 'down' | 'left' | 'above' | 'below';
    }>;
    blockedEdges: string[];
    metadata: {
      mode: '2d' | '3d';
      difficulty: 'easy' | 'medium' | 'hard';
      timeLimit: number;
      maxMoves: number;
      generationType: 'manual';
      seed: null;
    };
  };
};

// Remote Level 1000 - "Remote First Exit" (2D).
// A minimal solvable 2D board: two arrows exit in sequence, matching the
// local-level authoring conventions (see docs/LEVEL_AUTHORING.md).
const remoteLevel1000: RemoteLevelSeed = {
  number: 1000,
  name: 'Remote First Exit',
  difficulty: 'easy',
  definitionJson: {
    nodes: [
      { id: 'n0_0', x: 0, y: 0 },
      { id: 'n1_0', x: 1, y: 0 },
      { id: 'n2_0', x: 2, y: 0 },
      { id: 'n0_1', x: 0, y: 1 },
      { id: 'n1_1', x: 1, y: 1 },
      { id: 'n2_1', x: 2, y: 1 },
    ],
    edges: [
      { id: 'n0_0-n1_0', fromNodeId: 'n0_0', toNodeId: 'n1_0', direction: 'right' },
      { id: 'n1_0-n2_0', fromNodeId: 'n1_0', toNodeId: 'n2_0', direction: 'right' },
      { id: 'n0_1-n1_1', fromNodeId: 'n0_1', toNodeId: 'n1_1', direction: 'right' },
      { id: 'n1_1-n2_1', fromNodeId: 'n1_1', toNodeId: 'n2_1', direction: 'right' },
      { id: 'n0_0-n0_1', fromNodeId: 'n0_0', toNodeId: 'n0_1', direction: 'down' },
      { id: 'n1_0-n1_1', fromNodeId: 'n1_0', toNodeId: 'n1_1', direction: 'down' },
      { id: 'n2_0-n2_1', fromNodeId: 'n2_0', toNodeId: 'n2_1', direction: 'down' },
    ],
    arrows: [
      {
        id: 'a1',
        occupiedEdges: ['n0_0-n1_0', 'n1_0-n2_0'],
        startNodeId: 'n0_0',
        endNodeId: 'n2_0',
        direction: 'right',
      },
      {
        id: 'a2',
        occupiedEdges: ['n0_1-n1_1', 'n1_1-n2_1'],
        startNodeId: 'n0_1',
        endNodeId: 'n2_1',
        direction: 'right',
      },
    ],
    blockedEdges: [],
    metadata: {
      mode: '2d',
      difficulty: 'easy',
      timeLimit: 120,
      maxMoves: 20,
      generationType: 'manual',
      seed: null,
    },
  },
};

// Remote Level 1001 - "Remote Vertical Post" (3D).
// Two stacked single-row layers (z=0, z=1, 3 nodes each) joined by one
// vertical post arrow at column 2, using the `below` layer direction per
// docs/LEVEL_AUTHORING.md §16. The post must exit first (nothing sits below
// the last layer); once it clears, both horizontal arrows can exit past the
// column-2 node their sweep passes through. All three arrows are node-disjoint
// at level start; every node is covered (no-free-nodes) and the graph is a
// single connected component.
const remoteLevel1001: RemoteLevelSeed = {
  number: 1001,
  name: 'Remote Vertical Post',
  difficulty: 'medium',
  definitionJson: {
    nodes: [
      { id: 'n0_0_0', x: 0, y: 0, z: 0 },
      { id: 'n1_0_0', x: 1, y: 0, z: 0 },
      { id: 'n2_0_0', x: 2, y: 0, z: 0 },
      { id: 'n0_0_1', x: 0, y: 0, z: 1 },
      { id: 'n1_0_1', x: 1, y: 0, z: 1 },
      { id: 'n2_0_1', x: 2, y: 0, z: 1 },
    ],
    edges: [
      { id: 'n0_0_0-n1_0_0', fromNodeId: 'n0_0_0', toNodeId: 'n1_0_0', direction: 'right' },
      { id: 'n1_0_0-n2_0_0', fromNodeId: 'n1_0_0', toNodeId: 'n2_0_0', direction: 'right' },
      { id: 'n0_0_1-n1_0_1', fromNodeId: 'n0_0_1', toNodeId: 'n1_0_1', direction: 'right' },
      { id: 'n1_0_1-n2_0_1', fromNodeId: 'n1_0_1', toNodeId: 'n2_0_1', direction: 'right' },
      { id: 'n2_0_0-n2_0_1', fromNodeId: 'n2_0_0', toNodeId: 'n2_0_1', direction: 'below' },
    ],
    arrows: [
      {
        id: 'a1',
        occupiedEdges: ['n0_0_0-n1_0_0'],
        startNodeId: 'n0_0_0',
        endNodeId: 'n1_0_0',
        direction: 'right',
      },
      {
        id: 'a2',
        occupiedEdges: ['n0_0_1-n1_0_1'],
        startNodeId: 'n0_0_1',
        endNodeId: 'n1_0_1',
        direction: 'right',
      },
      {
        id: 'a3',
        occupiedEdges: ['n2_0_0-n2_0_1'],
        startNodeId: 'n2_0_0',
        endNodeId: 'n2_0_1',
        direction: 'below',
      },
    ],
    blockedEdges: [],
    metadata: {
      mode: '3d',
      difficulty: 'medium',
      timeLimit: 100,
      maxMoves: 30,
      generationType: 'manual',
      seed: null,
    },
  },
};

export const remoteLevels: RemoteLevelSeed[] = [remoteLevel1000, remoteLevel1001];
