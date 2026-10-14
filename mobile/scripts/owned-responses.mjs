const creationPath = /^\/(brands|categories|customers|products|quotations|orders|payments)(?:$|\/from-quotation\/\d+$)/;

export const ownedResource = path => path.match(creationPath)?.[1];

// Handle rejection immediately: a later Promise.all is too late for Node's
// unhandled-rejection policy. Logout, updates and empty action responses are not creates.
export function captureOwnedResponse(response, apiUrl, onRecord, onError) {
  const url = response.url();
  if (!url.startsWith(`${apiUrl}/`)) return null;
  const path = url.slice(apiUrl.length);
  if (!response.ok() || response.request().method() !== 'POST' || !ownedResource(path)) return null;
  return Promise.resolve().then(() => response.json())
    .then(body => {
      if (!body?.id) throw new Error(`Successful creation response has no record ID: ${path}`);
      onRecord(path, body);
    }).catch(error => onError(`Owned response ${path}: ${error.message}`));
}
