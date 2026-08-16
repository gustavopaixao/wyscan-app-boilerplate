<!-- Ported standalone from .cursor/rules/requirements.mdc (alwaysApply:true). -->

# __PROJECT_NAME__ Development Requirements

> Mobile is **Expo (React Native)** in `mobile/`. SwiftUI/Jetpack sections below are **platform UX references** (HIG, Material, a11y); implement via React Native primitives unless you add native modules.

## 1. Platform Best Practices & Standard Icons

### iOS (SwiftUI)

- **Icons**: Use SF Symbols exclusively for all iconography
  - Prefer system-provided symbols over custom icons when available
  - Use semantic colors that adapt to light/dark mode automatically
  - Examples: `systemName: "star.fill"`, `systemName: "qrcode"`, `systemName: "camera.fill"`
- **Navigation**: Use `NavigationStack` (iOS 16+) with proper navigation patterns
- **UI Components**: Follow Human Interface Guidelines (HIG)
  - Use native SwiftUI components (`Button`, `List`, `Form`, etc.)
  - Implement proper accessibility labels and hints
  - Support Dynamic Type for text scaling
- **Gestures**: Use standard iOS gesture patterns (tap, long press, swipe)

### Android (Kotlin)

- **Icons**: Use Material Icons exclusively
  - Import from `androidx.compose.material.icons.Icons` or Material Icon Library
  - Use filled, outlined, or rounded variants consistently
  - Examples: `Icons.Default.Star`, `Icons.Default.QrCode`, `Icons.Default.Camera`
- **Navigation**: Use Navigation Component with proper back stack management
- **UI Components**: Follow Material Design 3 guidelines
  - Use Material 3 components (`Button`, `Card`, `TextField`, etc.)
  - Implement proper content descriptions for accessibility
  - Support font scaling and accessibility services
- **Gestures**: Use standard Android gesture patterns

### React (Next.js web, Expo mobile)

Use **shared, recognizable icon families** instead of one-off inline SVG for standard UI chrome (buttons, nav, lists, alerts). Pick glyphs that stay close to what users expect on **iOS** (SF Symbols–like clarity) and **Android** (Material symbols).

- **`web/__PROJECT_SLUG__-admin` and `web/__PROJECT_SLUG__-site`**: Prefer **`react-icons`**. Import named icons from sub-packages only (tree-shaking). Default mapping for platform feel:
  - **Material / Android-aligned**: `react-icons/md` (Material Design)
  - **iOS-friendly / cross-platform**: `react-icons/io5` (Ionicons) or `react-icons/hi2` (Heroicons)
  - Use **one family per surface or feature** where possible for visual consistency; do not mix unrelated sets in the same dense toolbar.
- **`mobile/` (Expo)**: Prefer **`@expo/vector-icons`** (e.g. `MaterialIcons`, `Ionicons`, `MaterialCommunityIcons`) so in-app icons stay aligned with **Material** on Android and common **iOS** tab bar / list patterns. When a screen is mirrored on web admin, choose the **same semantic** icon (e.g. same “settings” or “chevron” role) even if the exact glyph differs slightly between stacks.
- **Wyscan / design system**: If `wyscan-react-native` or another package supplies an icon or icon slot, use that and do not duplicate with a second library for the same control.
- **Accessibility**: Pair decorative icons with visible text where possible; otherwise set **`aria-label`** / **`accessibilityLabel`** on the control, not only on the raw icon.

## 2. Light & Dark Mode Support

### Requirements

- **Every new view/screen MUST support both light and dark mode**
- Use semantic colors that automatically adapt to the current appearance
- Test all screens in both light and dark mode before marking as complete

### iOS Implementation

- Use `Color.primary`, `Color.secondary`, and semantic colors from `ColorScheme`
- Create custom colors in Assets.xcassets with both light and dark variants
- Use `@Environment(\.colorScheme)` to detect current mode when needed
- Example:
  ```swift
  @Environment(\.colorScheme) var colorScheme
  .background(colorScheme == .dark ? Color.black : Color.white)
  ```

### Android Implementation

- Use Material 3 color tokens (`MaterialTheme.colorScheme.primary`, etc.)
- Define colors in `res/values/colors.xml` and `res/values-night/colors.xml`
- Use `isSystemInDarkTheme()` or `LocalConfiguration.current.uiMode` in Compose
- Example:
  ```kotlin
  val isDark = isSystemInDarkTheme()
  MaterialTheme(
    colorScheme = if (isDark) darkColorScheme() else lightColorScheme()
  )
  ```

### Testing Checklist

- [ ] All screens render correctly in light mode
- [ ] All screens render correctly in dark mode
- [ ] Text contrast meets WCAG AA standards in both modes
- [ ] Icons and images are visible in both modes
- [ ] Custom colors adapt properly

## 3. Internationalization (i18n) - All Labels Must Be Translatable

### Requirements

- **NO hard-coded strings in UI code**
- All user-facing text MUST come from localization files
- Support languages: English (en), Portuguese Brazil (pt-BR), Portuguese Portugal (pt-PT), Spanish (es), French (fr), German (de), Italian (it), Dutch (nl)
- Use descriptive, context-aware translation keys

### iOS Implementation

- All strings in `Localizable.strings` files
- Use `Text(LocalizedStringKey("key"))` or `NSLocalizedString("key", comment: "")`
- Provide comments for translators in `.strings` files
- Format strings with placeholders: `"welcome_message" = "Hello, %@!";`
- Example:
  ```swift
  Text("album_list_title")  // ✅ Correct
  Text("My Albums")         // ❌ Wrong - hard-coded
  ```

### Android Implementation

- All strings in `strings.xml` files per locale
- Use `stringResource(R.string.key)` in Compose or `getString(R.string.key)` in Views
- Provide translatable="true" attribute (default)
- Format strings with placeholders: `<string name="welcome_message">Hello, %1$s!</string>`
- Example:
  ```kotlin
  Text(stringResource(R.string.album_list_title))  // ✅ Correct
  Text("My Albums")                                 // ❌ Wrong - hard-coded
  ```

### Translation Key Naming Convention

- Use snake_case: `album_list_title`, `button_create_album`
- Group by feature: `album_*`, `sticker_*`, `duplicate_*`, `settings_*`
- Include context: `button_*`, `label_*`, `title_*`, `message_*`, `error_*`

### Checklist for New Features

- [ ] All UI text uses localization keys
- [ ] Translation keys added to all language files (en, pt-BR, pt-PT, es, fr, de, it, nl)
- [ ] Placeholder strings tested with long translations
- [ ] No hard-coded numbers, dates, or currency (use formatters)
- [ ] Error messages are translatable

## 4. Clean Architecture Organization

### Architecture Layers

#### Presentation Layer (UI)

- **Location**: `/Views` (iOS) or `/ui` (Android)
- Contains: Screens, ViewModels/ObservableObjects, UI State
- **Rules**:
  - Views should be thin and delegate logic to ViewModels
  - No business logic in Views
  - Views only handle UI rendering and user interactions

#### Domain Layer (Business Logic)

- **Location**: `/Domain` or `/UseCases` (if applicable)
- Contains: Business rules, domain models, use cases
- **Rules**:
  - Platform-agnostic business logic
  - No dependencies on UI or data layer
  - Pure functions and data structures

#### Data Layer

- **Location**: `/Data` and `/Storage`
- Contains: Data models, repositories, storage implementations
- **Rules**:
  - Handles all persistence (UserDefaults, FileManager, SharedPreferences, Files)
  - Implements data transformation between storage and domain models
  - No business logic, only data operations

### Project Structure

#### iOS (SwiftUI)

```
mobile/
  /Presentation
    /Views          # Screen views
    /ViewModels     # ObservableObjects
    /Components     # Reusable UI components
  /Domain
    /Models         # Domain models
    /UseCases       # Business logic (if needed)
  /Data
    /Models         # Data models (Codable)
    /Repositories   # Data access interfaces
  /Storage
    /iOS            # iOS-specific storage implementations
  /Utils
    /Extensions     # Swift extensions
    /Helpers        # Utility functions
  /Resources
    /Localization   # .lproj folders
    /Assets         # Colors, images, icons
```

#### Android (Kotlin)

```
app/src/main/java/com/__PROJECT_SLUG__/
  /presentation
    /ui            # Compose screens or Activities/Fragments
    /viewmodel     # ViewModels
    /components    # Reusable UI components
  /domain
    /models        # Domain models
    /usecases      # Business logic (if needed)
  /data
    /models        # Data models
    /repositories  # Data access interfaces
  /storage
    /android       # Android-specific storage implementations
  /utils
    /extensions    # Kotlin extensions
    /helpers       # Utility functions
  /res
    /values           # strings.xml (English default)
    /values-pt-rBR    # Portuguese (Brazil)
    /values-pt-rPT    # Portuguese (Portugal)
    /values-es        # Spanish
    /values-fr        # French
    /values-de        # German
    /values-it        # Italian
    /values-nl        # Dutch
```

### Dependency Rules

- **Presentation** → **Domain** (can depend on domain models)
- **Data** → **Domain** (implements domain interfaces)
- **Presentation** → **Data** (via dependency injection or protocols/interfaces)
- **NO circular dependencies**

## 5. Reusable Components & Functions

### Component Reusability Principles

- **DRY (Don't Repeat Yourself)**: Extract common patterns into reusable components
- **Single Responsibility**: Each component should do one thing well
- **Composition over Duplication**: Build complex UIs from simple, reusable parts
- **Parameterization**: Make components flexible through parameters/props

### When to Create Reusable Components

- ✅ Same UI pattern appears 2+ times
- ✅ Component has clear, single purpose
- ✅ Component can be parameterized for different use cases
- ✅ Component encapsulates styling or behavior logic

### Component Examples

#### iOS (SwiftUI)

```swift
// ✅ Reusable component
struct StickerTile: View {
    let number: Int
    let isOwned: Bool
    let duplicateCount: Int
    let onTap: () -> Void

    var body: some View {
        // Implementation
    }
}

// ✅ Reusable button style
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        // Implementation
    }
}
```

#### Android (Kotlin/Compose)

```kotlin
// ✅ Reusable component
@Composable
fun StickerTile(
    number: Int,
    isOwned: Boolean,
    duplicateCount: Int,
    onClick: () -> Unit
) {
    // Implementation
}

// ✅ Reusable button style
@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    // Implementation
}
```

### Function Reusability

- Extract common business logic into utility functions
- Create extension functions for common operations
- Use protocols/interfaces for testable, swappable implementations

### Examples of Reusable Functions

- **Formatting**: Date, number, currency formatters
- **Validation**: Input validation logic
- **Computation**: Progress calculations, duplicate detection
- **Storage**: Generic save/load operations

### Checklist for New Features

- [ ] Check if similar component/function already exists
- [ ] Extract reusable parts before implementing
- [ ] Make components configurable through parameters
- [ ] Document component props/parameters
- [ ] Test component in isolation when possible

## 6. Code Quality Standards

### General Principles

- **Readability**: Code should be self-documenting with clear naming
- **Maintainability**: Easy to modify and extend
- **Testability**: Business logic should be testable
- **Consistency**: Follow platform conventions and project patterns

### Naming Conventions

- **iOS**: PascalCase for types, camelCase for variables/functions
- **Android**: PascalCase for classes, camelCase for variables/functions
- Use descriptive names: `calculateAlbumProgress()` not `calc()`
- Boolean variables: `isOwned`, `hasDuplicates`, `canShare`

### Documentation

- Document public APIs and complex logic
- Use comments to explain "why", not "what"
- Keep comments up-to-date with code changes

### Error Handling

- Handle errors gracefully with user-friendly messages
- Log errors appropriately (no sensitive data)
- Provide fallback behaviors when possible

## 7. Implementation Checklist for New Features

When implementing a new feature, ensure:

- [ ] Uses platform-standard icons (native: SF Symbols / Material; **web:** `react-icons`; **Expo:** `@expo/vector-icons` per §1 React)
- [ ] Supports light and dark mode
- [ ] All labels are translatable (no hard-coded strings)
- [ ] Follows clean architecture (proper layer separation)
- [ ] Components/functions are reusable when applicable
- [ ] Code follows naming conventions
- [ ] Error handling is implemented
- [ ] Tested in both light and dark mode
- [ ] Tested with all supported languages (en, pt-BR, pt-PT, es, fr, de, it, nl)
- [ ] Accessibility labels/descriptions added
- [ ] No hard-coded colors (use semantic/system colors)
