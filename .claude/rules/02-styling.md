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
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
});

// Wrong — inline styles
<View style={{ flex: 1, padding: 16, backgroundColor: '#f9fafb' }}>
```

### Color Palette (Must Match Web App)

Use these exact hex values to maintain visual consistency with the web frontend:

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

```javascript
// Use consistent color values
<View style={[styles.statCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>

// Don't use random colors
<View style={{ backgroundColor: 'dodgerblue' }}>
```

> **Future:** Consider extracting these into a shared `theme.ts` constants file.

### Standard Component Styles

```javascript
// Card pattern
card: {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 5,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,                    // Android shadow
},

// Screen container
container: {
  flex: 1,
  backgroundColor: '#f9fafb',
  padding: 16,
},

// Loading container
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},

// Section title
sectionTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#111827',
  marginBottom: 16,
},
```

### Spacing Standards

| Usage              | Value   |
| ------------------ | ------- |
| Screen padding     | `16`    |
| Card padding       | `16`    |
| Card border radius | `12`    |
| Card margin bottom | `16`    |
| Section gap        | `20`    |
| Element spacing    | `8–12`  |

### Typography Standards

| Element            | Font Size | Weight   | Color     |
| ------------------ | --------- | -------- | --------- |
| Screen title       | `24`      | `bold`   | `#111827` |
| Section title      | `18`      | `bold`   | `#111827` |
| Stat value         | `20`      | `bold`   | `#1f2937` |
| Body text          | `15`      | `normal` | `#4b5563` |
| Label text         | `13`      | `500`    | `#6b7280` |
| Caption/muted      | `12`      | `normal` | `#9ca3af` |

---

