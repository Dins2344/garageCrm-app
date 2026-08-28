# GaragePulse Mobile — Working Agreement

`garageCrm-app` — the Android/iOS client for a multi-tenant garage/workshop
CRM. React Native 0.81 · Expo 54 · TypeScript · React Navigation 7 · Axios ·
AsyncStorage · Jest + React Native Testing Library. Ships to the Play Store via
EAS as `com.dctechs.garagepulse`.

**This is a standalone repository.** The API (`garageCrm-be`) and the web
client (`garageCrm-fe`) live in separate repos and deploy on their own
schedule. Anything shared with them is duplicated by hand — see *Mirrored
files* below.

**Published builds cannot be force-upgraded.** Someone is running last
release's binary against today's API, so backend changes must stay additive
and this app must tolerate fields it does not know about.

---

## Non-negotiables

1. **Run ESLint before pushing.** This repo's `tsconfig` does not set
   `noUnusedLocals`, so `tsc` passes on unused imports while ESLint errors on
   them — and CI runs `npm run lint`. Typecheck plus tests is not sufficient.
2. **Storage keys always come from `utils/constants.ts`**, never inlined.
3. **Never hardcode currency, locale, tax labels or date formats** — they come
   from `useGarage().locale` via `utils/format.ts`.
4. **Never use emoji.** Use `@expo/vector-icons` Ionicons.
5. **Never define a component inside another component's render body** — React
   treats it as a new type every render, so it loses state and input focus on
   every keystroke. Module scope, always.
6. **Install dependencies under Node 20 / npm 10** — a lock file from a newer
   npm fails CI's `npm ci`.

## Everything visual comes from `src/theme.ts`

There are **zero hex literals outside that file**. Colour, radius, spacing,
type scale and elevation are all tokens:

```javascript
import { colors, radius, spacing, type, elevation } from '../theme';
```

The app runs the same **Service Counter** palette as the web client — warm
bone grounds, ink for dark bands — but deliberately keeps a small corner
radius (`radius.lg` = 10) and real Android elevation, where web is square and
flat. Zero radius reads as deliberate on a web page and as unfinished against
Material's conventions.

Three things that bite:

1. **`colors.border` divides; `colors.borderStrong` is a control edge.** An
   input bordered with `border` sits at ~1.2:1 against its ground — invisible.
   Anything operable uses `borderStrong`.
2. **`colors.primary` (blue) is the in-app action; `colors.accent` (orange) is
   the one action that completes a flow.** One `accent` per screen, at most.
3. **Spread `elevation.card`, don't hand-write shadows.** iOS reads the
   `shadow*` props and Android reads `elevation`; the preset carries both, and
   a hand-written shadow usually forgets the Android half.

The theme was extracted from 908 inlined literals in a refactor proved
value-for-value against a snapshot, *then* the values were changed. Keeping
those two steps apart is what made a 21-screen restyle one readable diff — do
the same for the next one.

## Layering

Screens own data fetching and local state, and define `StyleSheet.create()` at
the bottom of the file. Components take props and never call API services or
navigation hooks. API modules in `src/api/` never touch UI state or toasts.

## Use the components that exist

| Need | Use |
| --- | --- |
| Dropdown / option list | `BottomSheetPicker` (supports `searchable`) |
| Labelled text input | `Field` from `FormControls` |
| Primary action button | `PrimaryBtn` from `FormControls` |
| Screen wrapper / max width | `ResponsiveScreen` |
| Job status progression | `StatusStepper` |
| Feature tour / swipeable slides | `FeatureCarousel` (content in `tourSlides.ts`) |
| Toast styling | `toastConfig` |

Use it → extend it with a prop → only then build new.

## Storage keys — two categories, and picking wrong is silent

```javascript
import { TOKEN_KEY, SESSION_STORAGE_KEYS } from '../utils/constants';
await AsyncStorage.getItem(TOKEN_KEY);
await AsyncStorage.multiRemove([...SESSION_STORAGE_KEYS]);   // logout, and the 401 handler
```

They were inlined 18 times once, which is how the "More on the web" banner key
got left out of logout — the banner never reappeared, and on a shared garage
device one person's dismissal hid it from everyone after them. A storage key
must never live in a component file.

Every key goes in exactly one of two lists, and which one is a product decision:

- **`SESSION_STORAGE_KEYS`** — cleared on sign-out, by both
  `AuthContext.logout()` and the 401 handler in `api/apiInterceptor.ts`.
  **This is the default.**
- **`DEVICE_STORAGE_KEYS`** — never cleared. Currently only the two walkthrough
  flags. They are device-scoped because `IdleTimer` signs people out after 10
  idle minutes; a workshop phone does that several times a day, so a
  session-scoped "already seen" flag would replay the first-run tour constantly.

**The test: would the next person to sign in on a shared workshop phone be
harmed by inheriting this value?** A dismissed banner fails that test. "This
phone already played its intro" passes it. If you are unsure, it is a SESSION
key. `TOUR_SEEN_USERS_KEY` holds a list of user ids precisely so "once per
person" survives while the storage itself stays install-scoped.

`ALL_STORAGE_KEYS` was deleted rather than redefined as the union of the two —
a plausible name sitting beside the correct one is how the banner bug comes
back. Both directions are pinned by tests in `AuthContext.test.tsx`.

## Forms — react-hook-form + zod, and `useController` is not optional

Every form is `useForm` + `zodResolver`, and **every rule lives in
`src/utils/validation.ts`** — a mirror of the web client's copy. Do not write a
validation rule in a screen.

**`register()` does not work here.** It binds by attaching a DOM ref and
listening for native `change`/`blur` events, and a `TextInput` has neither.
Spreading `register('name')` onto one typechecks, renders, and then silently
never sees a keystroke — the form validates nothing and submits empty. Every
field binds through `useController` instead:

```jsx
const { control, handleSubmit, formState: { isSubmitting } } =
  useForm<CustomerFormValues>({ resolver: zodResolver(customerSchema(locale)) });

<ControlledField control={control} name="name" label="Full Name" required />
<ControlledPicker control={control} name="role" label="Role" options={...} />
<PrimaryBtn onPress={handleSubmit(onValid)} loading={isSubmitting} ... />
```

`ControlledField` and `ControlledPicker` in `components/FormControls` are the
shared bindings. A screen with its own local `F`/`Field` (Customers, Staff,
Vehicles, Login) does the same `useController` call inline — keep those at
module scope, or the remount-per-keystroke bug returns.

Four settled points:

1. **The schemas mirror the backend's Mongoose validators deliberately.** A
   client rule stricter than the server rejects data the API would accept; a
   looser one hands the user a server error after a round trip. Each odd rule
   names the backend file it came from — the email regex really does reject
   `.info`, because `models/User.ts` does.
2. **Optional means "blank is fine", never "anything goes".** Everything
   optional goes through `optionalOf()`, so an empty field passes but a filled
   one is held to the full rule.
3. **No `Toast.show({ type: 'error', text1: 'Name is required' })`.** A toast
   cannot point at a field and is gone before the user scrolls to it. Errors
   render under the input. A toast is still right for a *server* answer — a
   rejected password, a duplicate email — which no client rule could check.
4. **Where a gate is not a form** — the job-card wizard's Next button, the
   estimation editor's Save — it still runs the schema via `safeParse` and
   shows *why* it is blocked next to the button.

`useWatch`, not the `watch()` returned by `useForm`: this repo's lint
(`react-hooks/incompatible-library`) rejects `watch()` as unmemoizable.

Every form input carries `accessibilityLabel={label}`. RN does not associate a
`<Text>` label with an input, so without it a screen reader announces an
unlabelled edit box — and tests are pushed onto the placeholder, which follows
the garage's country and changes per tenant.

## Locale

`locale` comes from `useGarage()`; format through `src/utils/format.ts`.
Resolution order is active branch → `user.locale` → India, because staff never
load a branch list and `user.locale` is their only source.

## Hermes `Intl` caveat

`utils/format.ts` probes `Intl` once at module load and falls back to
`"INR 1,234.00"` if it is unavailable. Avoid `currencyDisplay: 'narrowSymbol'`,
`notation: 'compact'`, `formatToParts`, `PluralRules` and `RelativeTimeFormat`
— Hermes support is unreliable.

**jest-expo runs on Node's full-ICU V8, not Hermes.** A green test run does not
prove formatting works on a device. Formatting changes need a manual check on a
real Android device and an iOS simulator.

## Mirrored files — kept in step with `garageCrm-fe` by hand

There is no shared package between the two clients. These files are duplicates,
and a change to one without the other is a silent divergence. The other repo is
**`github.com/Dins2344/garageCrm-fe`** — if you only have this one cloned, open a
matching PR there.

| This repo | Web repo |
| --- | --- |
| `src/types/models.ts` | `src/types/models.ts` |
| `src/utils/format.ts` | `src/utils/format.ts` |
| `src/utils/locale.ts` | `src/utils/locale.ts` |
| `src/utils/format.test.ts` | `src/utils/format.test.ts` |
| `src/utils/validation.ts` | `src/utils/validation.ts` |
| `src/utils/validation.test.ts` | `src/utils/validation.test.ts` |
| `src/hooks/useCountries.ts` | `src/hooks/useCountries.ts` |
| `src/utils/constants.ts` (the `garagepulse_*` key strings only) | `src/utils/constants.ts` |
| `.claude/rules/00-shared-*.md` | `.claude/rules/00-shared-*.md` |

Enum string values must also match `types/domain.ts` in `garageCrm-be`.

## Testing notes

- Screens using `useFocusEffect` need it mocked, or a `NavigationContainer`.
  Mock factories are hoisted above imports, so `require()` inside the factory
  and prefix any outer variable with `mock`.
- Mock `GarageContext` with a real `locale` (`DEFAULT_LOCALE`) — the provider
  never yields `undefined`.
- Scope queries with `within(getByTestId(...))` where a label appears in more
  than one section.

## Verifying

```bash
npx tsc --noEmit && npx eslint . && npm test
```

Before pushing dependency changes: `npx -y npm@10 ci --dry-run`.

---

## Reference

| Topic | File |
| --- | --- |
| Project structure, layering, naming | `.claude/rules/01-architecture.md` |
| Styling rules and shadow conventions | `.claude/rules/02-styling.md` |
| API services, navigation, screen patterns | `.claude/rules/03-data-and-navigation.md` |
| Auth, style, constants, icons, reuse, anti-patterns | `.claude/rules/04-conventions.md` |
| Platform notes, TypeScript, testing, performance | `.claude/rules/05-platform-and-testing.md` |
| Shared: API contract, colours, enums, universal don'ts | `.claude/rules/00-shared-contract.md` |
| Shared: no emoji | `.claude/rules/00-shared-no-emoji.md` |
| Shared: Node/npm version discipline | `.claude/rules/00-shared-node-and-npm.md` |
| Shared: constants | `.claude/rules/00-shared-constants.md` |
| Shared: component reuse and UI guidelines | `.claude/rules/00-shared-component-reuse.md` |

`00-shared-*` files are duplicated across all three repos. Change one, copy it
to the other two.
