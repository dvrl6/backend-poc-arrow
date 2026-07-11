export type ManualLevelDefinition = {
  nodes: Array<{ id: string; x: number; y: number }>;
  edges: Array<{
    id: string;
    fromNodeId: string;
    toNodeId: string;
    direction: 'up' | 'right' | 'down' | 'left';
  }>;
  arrows: Array<{
    id: string;
    occupiedEdges: string[];
    startNodeId: string;
    endNodeId: string;
    direction: 'up' | 'right' | 'down' | 'left';
  }>;
  blockedEdges: string[];
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard';
    timeLimit: number;
    maxMoves: number;
    generationType: 'manual';
    seed: null;
  };
};

export type ManualLevelSeed = {
  number: number;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  definitionJson: ManualLevelDefinition;
};

type Direction = 'up' | 'right' | 'down' | 'left';

type ArrowSpec = {
  id: string;
  nodes: string[];
  direction: Direction;
};

type LevelSpec = {
  number: number;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  width: number;
  height: number;
  arrows: ArrowSpec[];
  blockedEdges: Array<[string, string]>;
  timeLimit: number;
  maxMoves: number;
};

function nodeId(x: number, y: number): string {
  return `n${x}_${y}`;
}

function edgeId(fromNodeId: string, toNodeId: string): string {
  return `${fromNodeId}-${toNodeId}`;
}

function directionBetween(fromNodeId: string, toNodeId: string): Direction {
  const [, fromX, fromY] = fromNodeId.match(/^n(\d+)_(\d+)$/) ?? [];
  const [, toX, toY] = toNodeId.match(/^n(\d+)_(\d+)$/) ?? [];
  const dx = Number(toX) - Number(fromX);
  const dy = Number(toY) - Number(fromY);

  if (dx === 1) return 'right';
  if (dx === -1) return 'left';
  if (dy === 1) return 'down';
  return 'up';
}

function buildLevel(spec: LevelSpec): ManualLevelSeed {
  const nodes = Array.from({ length: spec.height }, (_, y) =>
    Array.from({ length: spec.width }, (__, x) => ({ id: nodeId(x, y), x, y })),
  ).flat();

  const edges = nodes
    .flatMap((node) => {
      const candidates: Array<[number, number]> = [
        [node.x + 1, node.y],
        [node.x, node.y + 1],
      ];

      return candidates
        .filter(([x, y]) => x < spec.width && y < spec.height)
        .map(([x, y]) => {
          const toNodeId = nodeId(x, y);
          return {
            id: edgeId(node.id, toNodeId),
            fromNodeId: node.id,
            toNodeId,
            direction: directionBetween(node.id, toNodeId),
          };
        });
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const arrows = spec.arrows.map((arrow) => ({
    id: arrow.id,
    occupiedEdges: arrow.nodes
      .slice(0, -1)
      .map((fromNodeId, index) => edgeId(fromNodeId, arrow.nodes[index + 1])),
    startNodeId: arrow.nodes[0],
    endNodeId: arrow.nodes[arrow.nodes.length - 1],
    direction: arrow.direction,
  }));

  return {
    number: spec.number,
    name: spec.name,
    difficulty: spec.difficulty,
    definitionJson: {
      nodes,
      edges,
      arrows,
      blockedEdges: spec.blockedEdges.map(([from, to]) => edgeId(from, to)),
      metadata: {
        difficulty: spec.difficulty,
        timeLimit: spec.timeLimit,
        maxMoves: spec.maxMoves,
        generationType: 'manual',
        seed: null,
      },
    },
  };
}

const levelSpecs: LevelSpec[] = [
  {
    number: 1,
    name: 'First Exit',
    difficulty: 'easy',
    width: 3,
    height: 3,
    arrows: [{ id: 'a1', nodes: ['n0_1', 'n1_1'], direction: 'right' }],
    blockedEdges: [],
    timeLimit: 120,
    maxMoves: 20,
  },
  {
    number: 2,
    name: 'Two Paths',
    difficulty: 'easy',
    width: 3,
    height: 4,
    arrows: [
      { id: 'a1', nodes: ['n0_1', 'n1_1'], direction: 'right' },
      { id: 'a2', nodes: ['n2_3', 'n2_2'], direction: 'up' },
    ],
    blockedEdges: [['n1_2', 'n2_2']],
    timeLimit: 120,
    maxMoves: 22,
  },
  {
    number: 3,
    name: 'Corner Turn',
    difficulty: 'easy',
    width: 4,
    height: 3,
    arrows: [{ id: 'a1', nodes: ['n0_2', 'n1_2', 'n1_1'], direction: 'up' }],
    blockedEdges: [['n2_1', 'n3_1']],
    timeLimit: 115,
    maxMoves: 24,
  },
  {
    number: 4,
    name: 'Crossing Lanes',
    difficulty: 'easy',
    width: 4,
    height: 4,
    arrows: [
      { id: 'a1', nodes: ['n0_0', 'n1_0'], direction: 'right' },
      { id: 'a2', nodes: ['n3_3', 'n2_3'], direction: 'left' },
    ],
    blockedEdges: [['n1_1', 'n1_2']],
    timeLimit: 110,
    maxMoves: 26,
  },
  {
    number: 5,
    name: 'Small Detour',
    difficulty: 'easy',
    width: 4,
    height: 4,
    arrows: [{ id: 'a1', nodes: ['n0_3', 'n1_3', 'n1_2'], direction: 'up' }],
    blockedEdges: [
      ['n2_2', 'n3_2'],
      ['n0_1', 'n1_1'],
    ],
    timeLimit: 105,
    maxMoves: 28,
  },
  {
    number: 6,
    name: 'Middle Weave',
    difficulty: 'medium',
    width: 5,
    height: 4,
    arrows: [
      { id: 'a1', nodes: ['n0_2', 'n1_2', 'n2_2'], direction: 'right' },
      { id: 'a2', nodes: ['n4_1', 'n3_1'], direction: 'left' },
    ],
    blockedEdges: [
      ['n2_1', 'n2_2'],
      ['n1_3', 'n2_3'],
    ],
    timeLimit: 100,
    maxMoves: 30,
  },
  {
    number: 7,
    name: 'U Bend',
    difficulty: 'medium',
    width: 5,
    height: 5,
    arrows: [{ id: 'a1', nodes: ['n1_4', 'n1_3', 'n2_3', 'n3_3'], direction: 'right' }],
    blockedEdges: [
      ['n2_2', 'n3_2'],
      ['n3_1', 'n3_2'],
    ],
    timeLimit: 100,
    maxMoves: 32,
  },
  {
    number: 8,
    name: 'Double Gate',
    difficulty: 'medium',
    width: 5,
    height: 5,
    arrows: [
      { id: 'a1', nodes: ['n0_0', 'n1_0', 'n2_0'], direction: 'right' },
      { id: 'a2', nodes: ['n4_4', 'n4_3', 'n4_2'], direction: 'up' },
    ],
    blockedEdges: [
      ['n2_1', 'n3_1'],
      ['n1_3', 'n1_4'],
      ['n3_3', 'n4_3'],
    ],
    timeLimit: 95,
    maxMoves: 34,
  },
  {
    number: 9,
    name: 'Offset Lines',
    difficulty: 'medium',
    width: 6,
    height: 4,
    arrows: [
      { id: 'a1', nodes: ['n0_1', 'n1_1', 'n2_1'], direction: 'right' },
      { id: 'a2', nodes: ['n5_2', 'n4_2', 'n3_2'], direction: 'left' },
    ],
    blockedEdges: [
      ['n2_0', 'n3_0'],
      ['n2_2', 'n3_2'],
      ['n4_1', 'n4_2'],
    ],
    timeLimit: 95,
    maxMoves: 36,
  },
  {
    number: 10,
    name: 'Long Hook',
    difficulty: 'medium',
    width: 6,
    height: 5,
    arrows: [{ id: 'a1', nodes: ['n0_4', 'n1_4', 'n2_4', 'n2_3', 'n2_2'], direction: 'up' }],
    blockedEdges: [
      ['n3_2', 'n4_2'],
      ['n1_1', 'n2_1'],
      ['n4_3', 'n4_4'],
    ],
    timeLimit: 90,
    maxMoves: 38,
  },
  {
    number: 11,
    name: 'Hard Split',
    difficulty: 'hard',
    width: 6,
    height: 6,
    arrows: [
      { id: 'a1', nodes: ['n0_5', 'n1_5', 'n2_5', 'n2_4'], direction: 'up' },
      { id: 'a2', nodes: ['n5_0', 'n4_0', 'n3_0'], direction: 'left' },
    ],
    blockedEdges: [
      ['n2_2', 'n3_2'],
      ['n3_3', 'n4_3'],
      ['n1_1', 'n1_2'],
      ['n4_4', 'n5_4'],
    ],
    timeLimit: 85,
    maxMoves: 42,
  },
  {
    number: 12,
    name: 'Nested Turns',
    difficulty: 'hard',
    width: 6,
    height: 6,
    arrows: [
      { id: 'a1', nodes: ['n0_3', 'n1_3', 'n1_2', 'n2_2'], direction: 'right' },
      { id: 'a2', nodes: ['n5_5', 'n5_4', 'n4_4'], direction: 'left' },
    ],
    blockedEdges: [
      ['n2_1', 'n3_1'],
      ['n3_2', 'n3_3'],
      ['n0_4', 'n1_4'],
      ['n4_1', 'n5_1'],
    ],
    timeLimit: 80,
    maxMoves: 44,
  },
  {
    number: 13,
    name: 'Wide Pressure',
    difficulty: 'hard',
    width: 7,
    height: 5,
    arrows: [
      { id: 'a1', nodes: ['n0_0', 'n1_0', 'n2_0', 'n3_0'], direction: 'right' },
      { id: 'a2', nodes: ['n6_4', 'n5_4', 'n5_3'], direction: 'up' },
      { id: 'a3', nodes: ['n3_2', 'n4_2'], direction: 'right' },
    ],
    blockedEdges: [
      ['n2_2', 'n3_2'],
      ['n4_1', 'n5_1'],
      ['n1_3', 'n2_3'],
      ['n5_2', 'n6_2'],
    ],
    timeLimit: 80,
    maxMoves: 46,
  },
  {
    number: 14,
    name: 'Tight Spiral',
    difficulty: 'hard',
    width: 7,
    height: 6,
    arrows: [
      { id: 'a1', nodes: ['n1_5', 'n1_4', 'n2_4', 'n3_4', 'n3_3'], direction: 'up' },
      { id: 'a2', nodes: ['n6_0', 'n5_0', 'n4_0'], direction: 'left' },
    ],
    blockedEdges: [
      ['n2_2', 'n2_3'],
      ['n3_1', 'n4_1'],
      ['n4_3', 'n5_3'],
      ['n5_4', 'n5_5'],
      ['n0_2', 'n1_2'],
    ],
    timeLimit: 75,
    maxMoves: 50,
  },
  {
    number: 15,
    name: 'Final Grid',
    difficulty: 'hard',
    width: 7,
    height: 7,
    arrows: [
      { id: 'a1', nodes: ['n0_6', 'n1_6', 'n2_6', 'n2_5'], direction: 'up' },
      { id: 'a2', nodes: ['n6_0', 'n6_1', 'n5_1'], direction: 'left' },
      { id: 'a3', nodes: ['n3_3', 'n4_3', 'n4_2'], direction: 'up' },
    ],
    blockedEdges: [
      ['n1_1', 'n2_1'],
      ['n2_2', 'n3_2'],
      ['n3_4', 'n4_4'],
      ['n4_5', 'n5_5'],
      ['n5_2', 'n6_2'],
      ['n0_3', 'n1_3'],
    ],
    timeLimit: 70,
    maxMoves: 54,
  },
  // Levels 16-25 are figure (16-20) and multi-layer 3D (21-25) levels whose
  // authoritative, playable definitions live in the frontend's local assets
  // (`manual_levels_2d.json` / `manual_levels_3d.json`) and are never rendered
  // from the backend. These rows exist only so the backend has a `Level` per
  // internal number: the leaderboard and progress flows resolve a local level
  // number to its backend `Level.id` via `GET /levels`, and without a row here
  // that lookup returns null for 16-25 — which left every 3D level's
  // leaderboard permanently empty (it never reached `GET /leaderboard/:id`).
  // The `definitionJson` below is a minimal valid 2D placeholder; it is not the
  // real board and is intentionally not used for gameplay.
  ...Array.from({ length: 10 }, (_, index): LevelSpec => {
    const number = 16 + index;
    return {
      number,
      name: `Level ${number}`,
      difficulty: 'hard',
      width: 3,
      height: 3,
      arrows: [{ id: 'a1', nodes: ['n0_0', 'n1_0'], direction: 'right' }],
      blockedEdges: [],
      timeLimit: 90,
      maxMoves: 40,
    };
  }),
];

export const manualLevels: ManualLevelSeed[] = levelSpecs.map(buildLevel);
