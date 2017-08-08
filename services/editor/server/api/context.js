import jsonpatch from 'fast-json-patch';
import R from 'ramda';
import authenticatedClient from '../auth/authenticatedClient';

export async function getContext(req, res, { tweekApiHostname }, { params }) {
  const tweekApiClient = await authenticatedClient({ baseURL: tweekApiHostname });
  const response = await tweekApiClient.get(
    `api/v1/context/${params.identityName}/${encodeURIComponent(params.identityId)}`,
  );
  res.json(response.data);
}

const getDeletedKeys = R.useWith(R.difference, [Object.keys, Object.keys]);

export async function updateContext(req, res, { tweekApiHostname }, { params }) {
  const tweekApiClient = await authenticatedClient({ baseURL: tweekApiHostname });

  const contextUrl = `api/v1/context/${params.identityName}/${encodeURIComponent(
    params.identityId,
  )}`;

  const patch = req.body;

  const response = await tweekApiClient.get(contextUrl);
  const currentContext = response.data;
  const newContext = jsonpatch.applyPatch(R.clone(currentContext), patch).newDocument;

  const keysToDelete = getDeletedKeys(currentContext, newContext);
  const deleteKeys = keysToDelete.map(key => tweekApiClient.delete(`${contextUrl}/${key}`));

  const getModifiedKeys = R.pipe(
    R.useWith(R.symmetricDifference, [R.toPairs, R.toPairs]),
    R.filter(([key]) => !keysToDelete.includes(key)),
    R.map(([key]) => key),
  );

  const modifiedKeys = getModifiedKeys(currentContext, newContext);

  if (modifiedKeys.length > 0) {
    await tweekApiClient.post(contextUrl, R.pickAll(modifiedKeys, newContext));
  }

  await Promise.all(deleteKeys);

  res.sendStatus(200);
}
