import { createElement } from "react";

/**
 * Mirrors the Image stub in ./react-native.ts: emits a host element named
 * "Image" so component tests can keep asserting via findByType(root, "Image")
 * regardless of which library renders the image.
 */
export const Image = (props: Record<string, unknown>) =>
	createElement("Image", props);

// Type-only stub (erased at runtime).
export type ImageErrorEventData = { error: string };
