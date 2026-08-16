---
name: translator
description: When managing translations, checking for missing keys, or adding new translatable strings
---

# Translator Skill
**When to apply:** When managing translations, checking for missing keys, or adding new translatable strings.

### Supported Languages

English (en), Portuguese Brazil (pt-BR), Portuguese Portugal (pt-PT), Spanish (es), French (fr), German (de), Italian (it), Dutch (nl)

### Translation Key Naming

- Use snake_case: `album_list_title`, `button_create_album`
- Group by feature: `album_*`, `sticker_*`, `duplicate_*`, `settings_*`
- Include context: `button_*`, `label_*`, `title_*`, `message_*`, `error_*`

### Requirements

- **NO hard-coded strings in UI code**
- All user-facing text MUST come from localization files
- Provide comments for translators
- Test with all supported languages
