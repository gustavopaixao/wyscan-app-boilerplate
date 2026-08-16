// Test stub for expo-constants. The real module pulls in expo-modules-core's
// native EventEmitter, which is unavailable in the vitest `node` environment.
// Mirrors the shape consumed by app code (Constants.expoConfig?.extra) plus the
// execution-environment gate used by the extracted analytics native loaders.
type ExpoConfig = {
  extra?: Record<string, unknown>;
} | null;

export enum ExecutionEnvironment {
  Bare = "bare",
  Standalone = "standalone",
  StoreClient = "storeClient",
}

const Constants = {
  executionEnvironment: ExecutionEnvironment.Bare,
  expoConfig: { extra: {} } as ExpoConfig,
};

export default Constants;
