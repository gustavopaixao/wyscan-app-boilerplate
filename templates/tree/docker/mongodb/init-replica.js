// Legacy: single-node replica set init (deprecated — __PROJECT_NAME__ uses standalone MongoDB).
// Kept for reference only; not mounted by current docker-compose files.

try {
  const status = rs.status();
  print("Replica set already initialized");
  printjson(status);
} catch (e) {
  print("Initializing replica set...");
  const result = rs.initiate({
    _id: "rs0",
    members: [{ _id: 0, host: "localhost:27017" }],
  });
  printjson(result);

  let attempts = 0;
  while (attempts < 30) {
    try {
      const status = rs.status();
      if (status.ok === 1) {
        print("Replica set initialized successfully");
        break;
      }
    } catch (err) {
      // not ready
    }
    sleep(1000);
    attempts++;
  }
}
