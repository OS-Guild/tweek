import changeCase from 'change-case';
import R from 'ramda';
import authenticatedClient from '../server/auth/authenticatedClient';

const mapKeys = R.curry((fn, obj) =>
  R.fromPairs(R.map(R.adjust(fn, 0), R.toPairs(obj))));

export async function getContextSchema(req, res, { tweekApiHostname }) {
  const tweekApiClient = await authenticatedClient({ baseURL: tweekApiHostname });
  const response = await tweekApiClient.get('/api/v1/keys/@tweek/context/_?$ignoreKeyTypes=false');
  const schemaDetails = response.data;
  const processedSchemaDetails =
    Object.keys(schemaDetails)
      .reduce((result, identity) => ({
        ...result,
        [identity]: {...mapKeys(changeCase.pascalCase, schemaDetails[identity]), "@@id": "string"},
      }), {});

  res.json(processedSchemaDetails);
}

export async function getContext(req, res, { tweekApiHostname }, { params }) {
  const tweekApiClient = await authenticatedClient({ baseURL: tweekApiHostname });
  const response = await tweekApiClient.get(`api/v1/context/${params.contextType}/${encodeURIComponent(params.contextId)}`);
  res.json(response.data);
}

export async function updateContext(req, res, { tweekApiHostname }, { params }) {
  const tweekApiClient = await authenticatedClient({ baseURL: tweekApiHostname });

  const contextUrl = `api/v1/context/${params.contextType}/${encodeURIComponent(params.contextId)}`;

  const response = await tweekApiClient.get(contextUrl);
  const currentContext = response.data;
  const newContext = req.body;

  const deletedKeys = Object.keys(currentContext)
    .filter(key => key.includes("@fixed:"))
    .filter(key => !newContext.hasOwnProperty(key) )
    .map(key => tweekApiClient.delete(`${contextUrl}/${key}`));

  await Promise.all([
    ...deletedKeys,
    tweekApiClient.post(contextUrl, newContext),
  ]);

  res.sendStatus(200);
}
