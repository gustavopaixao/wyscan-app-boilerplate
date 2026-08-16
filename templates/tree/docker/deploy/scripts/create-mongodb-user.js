/**
 * Create __PROJECT_NAME__ MongoDB application user (run via setup-mongodb-user.sh).
 * Requires env: __PROJECT_CONST___MONGO_PASSWORD
 * Optional: __PROJECT_CONST___MONGO_USER (default __PROJECT_SLUG___user), __PROJECT_CONST___MONGO_DB (default __PROJECT_SLUG__)
 */
const dbName = process.env.__PROJECT_CONST___MONGO_DB || "__PROJECT_SLUG__";
const username = process.env.__PROJECT_CONST___MONGO_USER || "__PROJECT_SLUG___user";
const password = process.env.__PROJECT_CONST___MONGO_PASSWORD;

if (!password) {
  throw new Error("__PROJECT_CONST___MONGO_PASSWORD is required");
}

const appDb = db.getSiblingDB(dbName);
const existing = appDb.getUsers({ filter: { user: username } });

if (existing.users.length > 0) {
  print(`User "${username}" already exists on database "${dbName}" — skipped.`);
} else {
  appDb.createUser({
    user: username,
    pwd: password,
    roles: [{ role: "readWrite", db: dbName }],
  });
  print(`Created user "${username}" with readWrite on "${dbName}".`);
}

print("");
print("Connection string (set MONGODB_URL in .env):");
const query = process.env.MONGODB_URL_QUERY || `authSource=${dbName}`;
const host = process.env.MONGODB_URL_HOST || "host.docker.internal:27018";
print(
  `mongodb://${username}:<password>@${host}/${dbName}?${query}`,
);
