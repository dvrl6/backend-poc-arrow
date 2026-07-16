import { CreateLevelUseCase } from './create-level.use-case';
import { LevelEntity } from '../../domain/levels/level.entity';
import { LevelRepository, SaveLevelData } from '../ports/level.repository';

function fakeRepository(existing: LevelEntity | null = null): LevelRepository {
  return {
    findByNumber: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockImplementation(async (data: SaveLevelData) => ({
      id: 'generated-id',
      number: data.number,
      name: data.name,
      difficulty: data.difficulty,
      generationType: data.generationType,
      seed: data.seed,
      definitionJson: data.definitionJson,
    })),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };
}

describe('CreateLevelUseCase', () => {
  it('should_round_trip_3d_definition_json_unchanged_when_creating_a_remote_band_level', async () => {
    // Arrange: a remote-band (>=1000), 3D-shaped definition per the Phase 34.1
    // contract - non-zero z plus metadata.mode. Nothing in this path should
    // reshape or strip the JSON.
    const repository = fakeRepository();
    const useCase = new CreateLevelUseCase(repository);
    const definitionJson = {
      nodes: [
        { id: 'n0_0_0', x: 0, y: 0, z: 0 },
        { id: 'n0_0_1', x: 0, y: 0, z: 1 },
      ],
      edges: [{ id: 'n0_0_0-n0_0_1', fromNodeId: 'n0_0_0', toNodeId: 'n0_0_1', direction: 'below' }],
      arrows: [
        {
          id: 'a1',
          occupiedEdges: ['n0_0_0-n0_0_1'],
          startNodeId: 'n0_0_0',
          endNodeId: 'n0_0_1',
          direction: 'below',
        },
      ],
      blockedEdges: [],
      metadata: { mode: '3d' as const },
    };

    // Act
    const result = await useCase.execute({
      number: 1001,
      name: 'Remote Vertical Post',
      difficulty: 'medium',
      generationType: 'manual',
      seed: null,
      definitionJson,
    });

    // Assert
    expect(result.definitionJson).toEqual(definitionJson);
    const storedJson = result.definitionJson as unknown as typeof definitionJson;
    expect(storedJson.metadata.mode).toBe('3d');
    expect(storedJson.nodes.some((node) => node.z !== 0)).toBe(true);
  });

  it('should_reject_creation_when_a_level_with_the_same_number_already_exists', async () => {
    // Arrange
    const repository = fakeRepository({
      id: 'existing-id',
      number: 1000,
      name: 'Existing',
      difficulty: 'easy',
      generationType: 'manual',
      seed: null,
      definitionJson: { nodes: [], edges: [], arrows: [], blockedEdges: [], metadata: {} },
    });
    const useCase = new CreateLevelUseCase(repository);

    // Act & Assert
    await expect(
      useCase.execute({
        number: 1000,
        name: 'Duplicate',
        difficulty: 'easy',
        generationType: 'manual',
        seed: null,
        definitionJson: { nodes: [], edges: [], arrows: [], blockedEdges: [], metadata: {} },
      }),
    ).rejects.toThrow('A level with this number already exists.');
  });
});
