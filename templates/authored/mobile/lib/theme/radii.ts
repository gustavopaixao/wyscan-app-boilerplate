/** Corner radii, by the role of the surface rather than by size. */
export const radii = {
	/** Buttons, text fields, segmented controls. */
	control: 10,
	/** Cards and panels. */
	card: 12,
	/** Floating surfaces: menus, popovers. */
	menu: 14,
	/** Fully rounded chips and pills. */
	pill: 16,
	/** Skeleton placeholders. */
	skeleton: 8,
} as const;
