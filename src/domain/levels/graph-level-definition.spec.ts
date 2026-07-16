import { GraphLevelDefinitionValidator } from './graph-level-definition';

describe('GraphLevelDefinitionValidator', () => {
  const validator = new GraphLevelDefinitionValidator();

  it('should_accept_level_definition_when_required_shape_is_present', () => {
    // Arrange
    const definition = {
      nodes: [],
      edges: [],
      arrows: [],
      blockedEdges: [],
      metadata: {},
    };

    // Act
    const result = validator.validate(definition);

    // Assert
    expect(result).toBe(definition);
  });

  it('should_reject_level_definition_when_required_key_is_missing', () => {
    // Arrange
    const definition = {
      nodes: [],
      edges: [],
      arrows: [],
      metadata: {},
    };

    // Act & Assert
    expect(() => validator.validate(definition)).toThrow(
      'Level definition is missing required key: blockedEdges.',
    );
  });

  it('should_accept_3d_level_definition_with_non_zero_z_and_mode_metadata', () => {
    // Arrange: mirrors the Phase 34.1 contract - z on nodes plus an
    // additive metadata.mode hint, no schema/validator change required.
    const definition = {
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
      metadata: { mode: '3d' },
    };

    // Act
    const result = validator.validate(definition);

    // Assert
    expect(result).toBe(definition);
  });
});
