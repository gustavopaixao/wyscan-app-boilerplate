/** Dev machine hostname for Metro on physical devices (must not use localhost). */

function getDevHostFromEnv() {
  const raw =
    process.env.EXPO_PUBLIC_DEV_HOST?.trim() ||
    process.env.__PROJECT_CONST___DEV_HOST?.trim() ||
    "__DEV_HOST__";
  return raw.replace(/:\d+$/, "");
}

module.exports = {
  getDevHostFromEnv,
};
