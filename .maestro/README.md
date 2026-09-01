# End-to-end flows (Maestro)

These drive the **installed APK** on an emulator or a real device, so they
exercise the release build exactly as a tester's phone runs it — including the
update gate and the seeded sample data, neither of which the jest suite can
reach because both depend on the real API.

## They are manual only

Nothing runs these automatically. They are **not** in `.github/workflows/`, and
they are **not** in the pre-push checklist. An Android emulator job costs about
ten minutes of private-repo Actions minutes per run, and Play's own pre-launch
report already crawls every closed-track upload on real devices for free.

## Installing Maestro on Windows

Maestro's documented one-liner (`curl -Ls https://get.maestro.mobile.dev | bash`)
is macOS/Linux only. **You do not need WSL.** Maestro is a JVM CLI and its
release zip ships `bin/maestro.bat`, so it runs natively on Windows given a JDK —
which this machine already has (Amazon Corretto 17, `JAVA_HOME` set).

```powershell
$dest = "$env:USERPROFILE\.maestro"
New-Item -ItemType Directory -Force $dest | Out-Null
Invoke-WebRequest "https://github.com/mobile-dev-inc/maestro/releases/download/cli-2.10.0/maestro.zip" -OutFile "$env:TEMP\maestro.zip"
Expand-Archive "$env:TEMP\maestro.zip" -DestinationPath $dest -Force

# Put it on PATH permanently (user scope), and in the current session
$bin = "$dest\maestro\bin"
[Environment]::SetEnvironmentVariable('PATH', "$([Environment]::GetEnvironmentVariable('PATH','User'));$bin", 'User')
$env:PATH += ";$bin"

maestro --version
```

The download is ~315 MB, so it takes a minute.

## Running the flows

```powershell
# An emulator must be running and the build under test installed
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd Pixel_8_Pro
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r android\app\build\outputs\apk\release\app-release.apk

# All flows, in order
npm run test:e2e -- -e EMAIL=you@example.com -e PASSWORD=yourpassword

# Or one
maestro test .maestro\01-cold-start.yaml
```

`npm run test:e2e` is `maestro test .maestro`; npm runs it through cmd.exe, which
picks up `maestro.bat` from PATH.

## What each one is for

| Flow | Guards |
| --- | --- |
| `01-cold-start.yaml` | `UpdateGate` lets go within its bounded hold against the real API. This is the anti-brick check on a real binary — if a bad `AppRelease` policy is live, this fails loudly instead of in a support queue. |
| `02-login.yaml` | Sign in reaches the dashboard. Every other flow builds on it. |
| `03-sample-data.yaml` | A seeded garage is not an empty app. This is the regression guard for what the closed test failed on. |
| `04-create-job-card.yaml` | The job-card wizard mounts and its pickers load. |

## Two things that will bite

- **Selectors are accessibility labels, never placeholders.** Placeholders
  follow the garage's country (`locale.phoneExample`, the postal-code name), so
  a placeholder selector passes for an Indian tenant and fails for every other
  one. Every form input already carries `accessibilityLabel`.
- **`03` needs an account that still has its sample data.** Once you have
  tapped Remove, that flow will fail — correctly, but confusingly if you have
  forgotten. Register a fresh account for it.

## These run against whatever API the build points at

`eas.json` sets `EXPO_PUBLIC_API_URL` per profile, and every profile currently
points at production. A flow that registers an account therefore creates a real
garage — which is why none of these do. They sign in to an account you already
control.
