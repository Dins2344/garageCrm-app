<!-- Detailed reference for this repository, split by topic and read on demand.
     The always-on rules live in CLAUDE.md at the repo root. -->

## Styling Rules

### StyleSheet at Bottom of File

All styles MUST use `StyleSheet.create()` defined at the bottom of the component file.

```javascript
// Correct — styles at bottom
export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: type.display,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
});

// Wrong — inline styles, and hex literals
<View style={{ flex: 1, padding: 16, backgroundColor: '#f9fafb' }}>
```

### Colours come from `src/theme.ts` — never a hex literal

```javascript
import { colors, radius, spacing, elevation } from '../theme';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...elevation.card,
  },
  title: { fontSize: type.title, fontWeight: 'bold', color: colors.textPrimary },
});
```

There are **zero** hex literals left outside `theme.ts`; keep it that way. Use
`colors.*` (what a thing is *for*) and reach into `palette.*` only for a
genuine one-off.

Two pairs that are easy to get wrong:

- **`colors.border` is a divider. `colors.borderStrong` is a control edge.**
  An input or outlined button bordered with `border` sits at about 1.2:1
  against its ground — invisible. Anything operable uses `borderStrong`.
- **`colors.primary` (blue) is the in-app primary action. `colors.accent`
  (orange) is the one action that completes a flow.** At most one `accent` per
  screen or it stops meaning anything.

The reference values below are what the tokens resolve to. They are documented
for cross-repo comparison, not for copying into a StyleSheet:

| Token              | Hex        | Usage                          |
| ------------------ | ---------- | ------------------------------ |
| **Primary**        | `#3b5ff8`  | Active tab tint, primary buttons, links |
| **Background**     | `#f9fafb`  | Screen background (`gray-50`)  |
| **Card Background** | `#ffffff` | Card/surface background        |
| **Text Primary**   | `#111827`  | Headings, primary text (`gray-900`) |
| **Text Secondary** | `#4b5563`  | Body text (`gray-600`)         |
| **Text Muted**     | `#6b7280`  | Captions, labels (`gray-500`)  |
| **Border**         | `#e5e7eb`  | Card borders (`gray-200`)      |
| **Border Light**   | `#f3f4f6`  | List separators (`gray-100`)   |
| **Success**        | `#10b981`  | Success states, positive       |
| **Warning**        | `#f59e0b`  | Warning states, pending        |
| **Danger/Error**   | `#ef4444`  | Error states, destructive      |
| **Info**           | `#3b82f6`  | Informational states           |
| **Purple Accent**  | `#8b5cf6`  | Charts, secondary accent       |

> Extracted into `src/theme.ts`. The app moved onto the shared bone/ink ramp
> afterwards, so several rows above describe the *web* palette rather than
> what mobile renders today — `theme.ts` is the source of truth for mobile.

### Standard Component Styles

```javascript
// Card pattern — elevation.card carries both the iOS shadow* props and the
// Android elevation, so spreading it covers both platforms.
card: {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  padding: spacing.lg,
  marginBottom: spacing.lg,
  ...elevation.card,
},

// Screen container
container: {
  flex: 1,
  backgroundColor: colors.background,
  padding: spacing.lg,
},

// Loading container
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},

// Section title
sectionTitle: {
  fontSize: type.title,
  fontWeight: 'bold',
  color: colors.textPrimary,
  marginBottom: spacing.lg,
},
```

### Spacing Standards

| Usage              | Value   |
| ------------------ | ------- |
| Screen padding     | `spacing.lg` (16) |
| Card padding       | `spacing.lg` (16) |
| Card border radius | `radius.lg` (10)  |
| Card margin bottom | `spacing.lg` (16) |
| Section gap        | `spacing.xl` (20) |
| Element spacing    | `spacing.sm`–`md` |

### Typography Standards

| Element            | Size              | Weight   | Colour                 |
| ------------------ | ----------------- | -------- | ---------------------- |
| Screen title       | `type.display`    | `bold`   | `colors.textPrimary`   |
| Section title      | `type.title`      | `bold`   | `colors.textPrimary`   |
| Stat value         | `type.heading`    | `bold`   | `colors.textStrong`    |
| Body text          | `type.bodyLarge`  | `normal` | `colors.textSecondary` |
| Label text         | `type.label`      | `500`    | `colors.textMuted`     |
| Caption/muted      | `type.small`      | `normal` | `colors.textFaint`     |

---

