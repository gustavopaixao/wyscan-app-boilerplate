/** Google OAuth helpers shared by app.config (Node) and the app bundle. */

function googleReversedClientScheme(clientId) {
  if (!clientId?.endsWith(".apps.googleusercontent.com")) return undefined;
  const id = clientId.replace(/\.apps\.googleusercontent\.com$/, "");
  return `com.googleusercontent.apps.${id}`;
}

function googleNativeRedirectUri(clientId) {
  const scheme = googleReversedClientScheme(clientId);
  return scheme ? `${scheme}:/oauthredirect` : undefined;
}

function googleUrlSchemesFromClientIds(iosClientId, androidClientId) {
  const schemes = new Set();
  for (const id of [iosClientId, androidClientId]) {
    const scheme = googleReversedClientScheme(id);
    if (scheme) schemes.add(scheme);
  }
  return [...schemes];
}

module.exports = {
  googleReversedClientScheme,
  googleNativeRedirectUri,
  googleUrlSchemesFromClientIds,
};
