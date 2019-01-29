const { expect } = require('chai');
const jsonpatch = require('fast-json-patch');
const nconf = require('nconf');
const fetch = require('node-fetch');

const { init: initClients } = require('../../utils/clients');
const { pollUntil } = require('../../utils/utils');
const { createManifestForJPadKey } = require('../../utils/manifest');

describe('Gateway v2 API', () => {
  const key = 'integration_tests/some_key';

  let clients;
  before(async () => {
    clients = await initClients();
  });

  it('should get key using v2 (proxy to api service)', async () =>
    await clients.gateway.get(`/api/v2/values/${key}`).expect(200, '1.0'));

  it('should get key using v2 with keyPath query', async () =>
    await clients.gateway.get(`/api/v2/values?keyPath=${encodeURI(key)}`).expect(200, '1.0'));

  it('should get key using v2 without authentication', async () => {
    apiClient = await clients.gateway.with(client => client.unset('Authorization'));
    await apiClient.get(`/api/v2/values/${key}`).expect(200, '1.0');
  });

  it('should set and get context', async () => {
    const context = {
      FavoriteFruit: 'grape',
      Gender: 'female',
      IsInGroup: true,
    };

    await clients.gateway
      .post(`/api/v2/context/user/v2user`)
      .send(context)
      .expect(200);

    await clients.gateway
      .get(`/api/v2/context/user/v2user`)
      .expect(200)
      .then(r => {
        const result = r.body;
        delete result['@CreationDate'];
        expect(result).to.eql(context);
      });
  });

  it('should read schemas', async () => {
    expectedSchemas = [
      'delete_property_test',
      'edit_properties_test',
      'other',
      'test',
      'user',
    ].sort();
    await clients.gateway
      .get(`/api/v2/schemas`)
      .expect(200)
      .then(response => {
        expect(Object.keys(response.body).sort()).to.eql(expectedSchemas);
      });
  });

  it('should write schemas', async () => {
    const schema = { test: { type: 'string' } };
    await clients.gateway
      .post(`/api/v2/schemas/test_schema`)
      .send(schema)
      .expect(200);
  });

  it('should read search index', async () => {
    await clients.gateway.get(`/api/v2/search-index`).expect(200);
  });

  it('should read search', async () => {
    await clients.gateway.get(`/api/v2/search`).expect(200);
  });

  it('should read suggestions', async () => {
    await clients.gateway.get(`/api/v2/suggestions`).expect(200);
  });

  it('should read dependents', async () => {
    await clients.gateway.get('/api/v2/dependents/integration_tests/some_key').expect(200);
  });

  it('should read dependents with keyPath', async () => {
    await clients.gateway
      .get('/api/v2/dependents/?keyPath=integration_tests%2Fsome_key')
      .expect(200);
  });

  it('should read manifests', async () => {
    await clients.gateway.get('/api/v2/manifests').expect(200);
  });

  it('should read tags', async () => {
    await clients.gateway.get('/api/v2/tags').expect(200);
  });

  it('should read revision history', async () => {
    await clients.gateway.get('/api/v2/revision-history/integration_tests/some_key').expect(200);
  });

  it('should return a key with keyPath', async () => {
    const key = 'integration_tests/some_key';
    await clients.gateway
      .get(`/api/v2/keys?keyPath=${encodeURIComponent(key)}&author.name=test&author.email=test@soluto.com`)
      .expect(
        200,
        '{"manifest":{"key_path":"integration_tests/some_key","meta":{"name":"integration_tests/some_key","tags":[],"description":"","archived":false},"implementation":{"type":"const","value":1},"valueType":"number","dependencies":[]}}',
      );
  });

  it('should accept a valid key', async () => {
    const key = '@tests/integration/new_valid_key_2';
    await clients.gateway
      .put(`/api/v2/keys/${key}?author.name=test&author.email=test@soluto.com`)
      .send({
        manifest: createManifestForJPadKey(key),
        implementation: JSON.stringify({
          partitions: [],
          defaultValue: 'test',
          valueType: 'string',
          rules: [],
        }),
      })
      .expect(200);

    await pollUntil(
      () => clients.gateway.get(`/api/v2/values/${key}`),
      res => expect(res.body).to.eql('test'),
    );
  });

  it('should reject an invalid key with 400 error', async () => {
    const key = '@tests/integration/new_invalid_key_2';
    await clients.gateway
      .put(`/api/v2/keys/${key}`)
      .send({
        manifest: createManifestForJPadKey(key),
        implementation: JSON.stringify({
          partitins: [],
          defaultalue: 'test',
          valuType: 'string',
          ruls: [],
        }),
      })
      .expect(400);
  });

  it('should not create new commit for duplicate definition', async () => {
    const key = '@tests/integration/duplicate_2';
    async function saveKey() {
      return await clients.gateway
        .put(`/api/v2/keys/${key}`)
        .send({
          manifest: createManifestForJPadKey(key),
          implementation: JSON.stringify({
            partitions: [],
            defaultValue: 'test',
            valueType: 'string',
            rules: [],
          }),
        })
        .expect(200);
    }
    const res1 = await saveKey();
    expect(res1.header).to.have.property('x-oid');
    const res2 = await saveKey();
    expect(res2.header).to.not.have.property('x-oid');
  });

  it('should create new app', async () => {
    const res = await clients.gateway
      .post('/api/v2/apps')
      .send({
        name: 'test app'
      })
      .expect(200);

    const app = res.body;
    expect(app).hasOwnProperty('appId');
    expect(app).hasOwnProperty('appSecret');

    const appsRes = await clients.gateway
                            .get('/api/v2/apps')
                            .expect(200);

    expect(appsRes.body).to.include({[app.appId] : 'test app' });

    const policyRes = await clients.gateway.get('/api/v2/policies').expect(200);

    const currentPolicy = policyRes.body;

    const newPolicy = {
      policies: [
        ...currentPolicy.policies,
        {
          group: 'externalapps',
          user: app.appId,
          contexts: {},
          object: 'repo.keys/*',
          action: 'write',
          effect: 'allow',
        },
      ],
    };

    const patch = jsonpatch.compare(currentPolicy, newPolicy);
    await clients.gateway
      .patch('/api/v2/policies?author.name=test&author.email=test@soluto.com')
      .send(patch)
      .expect(200);

    await clients.gateway.get('/api/v2/policies').expect(200, newPolicy);

    const key = 'app_test_key';

    const options = {
      method: 'put',
      headers: {
        ['x-client-id']: app.appId,
        ['x-client-secret']: app.appSecret,
      },
      body: {
        manifest: createManifestForJPadKey(key),
        implementation: JSON.stringify({
          partitions: [],
          defaultValue: 'test',
          valueType: 'string',
          rules: [],
        }),
      },
    };

    await fetch(
      `${nconf.get(
        'GATEWAY_URL',
      )}/api/v2/keys/${key}?author.name=test&author.email=test@soluto.com`,
      options,
    );

    const cleanup = jsonpatch.compare(newPolicy, currentPolicy);
    await clients.gateway
      .patch('/api/v2/policies?author.name=test&author.email=test@soluto.com')
      .send(cleanup)
      .expect(200);
  });
});
