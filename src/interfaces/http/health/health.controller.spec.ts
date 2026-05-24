import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('should_return_ok_status_when_health_is_requested', () => {
    // Arrange
    const controller = new HealthController();

    // Act
    const response = controller.getHealth();

    // Assert
    expect(response.status).toBe('ok');
    expect(response.timestamp).toEqual(expect.any(String));
    expect(response.uptimeSeconds).toEqual(expect.any(Number));
  });
});
