import fetchMock from 'fetch-mock';

import * as AuthService from '../../../../src/services/auth-service';

import chai, { expect } from 'chai';
import chaiThings from 'chai-things';
chai.use(chaiThings);

describe('auth-service', () => {
  afterEach(() => fetchMock.restore());

  describe('getAuthProviders', () => {
    it('should fetch /authProviders', async () => {
      // Arrange
      const authProviders = [
        { name: 'authProvider1', url: '/auth1URL' },
        { name: 'authProvider2', url: '/auth2URL' },
      ];
      fetchMock.get('glob:*/authProviders', authProviders);

      // Act
      const res = await AuthService.getAuthProviders();

      // Assert
      expect(res).to.deep.equal(authProviders);
    });
  });
});
