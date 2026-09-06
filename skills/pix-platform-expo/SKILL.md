---
name: rule-platform-expo
description: >-
  Use when configuring EAS Build profiles, OTA updates, or CI/CD for Expo projects. Covers eas.json, build/submit workflows, and tag-driven pipelines.
tags:
  - "platform"
  - "expo"
frameworks: [expo, react-native]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# Expo EAS Builds & CI/CD

## Purpose

This skill covers the full EAS Build lifecycle for Expo projects:
eas.json configuration, multi-environment profiles, secrets management, OTA updates, and GitLab CI/CD pipelines with tag-driven releases.

Do **not** use the standard `gitlab-ci` skill for Expo projects - Expo apps use EAS Cloud Builds instead of Docker build/deploy stages.

## Step 1 - Generate eas.json

Create `eas.json` at the project root with inheritable profiles.

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "local"
  },
  "build": {
    "base": {
      "node": "22.x",
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "development",
        "EXPO_PUBLIC_APP_NAME": "MyApp (Dev)",
        "BUNDLE_ID": "com.company.myapp.uat",
        "EXPO_PUBLIC_API_URL": "https://dev-api.example.com"
      }
    },
    "development": {
      "extends": "base",
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium",
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "development-simulator": {
      "extends": "development",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "extends": "base",
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium",
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "preview",
        "EXPO_PUBLIC_APP_NAME": "MyApp (Preview)"
      }
    },
    "staging": {
      "extends": "base",
      "ios": {
        "resourceClass": "m-medium"
      },
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "staging",
        "EXPO_PUBLIC_APP_NAME": "MyApp (UAT)",
        "BUNDLE_ID": "com.company.myapp.uat",
        "EXPO_PUBLIC_API_URL": "https://staging-api.example.com"
      }
    },
    "production": {
      "extends": "base",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "production",
        "EXPO_PUBLIC_APP_NAME": "MyApp",
        "BUNDLE_ID": "com.company.myapp",
        "EXPO_PUBLIC_API_URL": "https://api.example.com"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "YOUR_ASC_APP_ID",
        "appleTeamId": "YOUR_APPLE_TEAM_ID"
      },
      "android": {
        "track": "internal"
      }
    },
    "staging": {
      "ios": {
        "ascAppId": "YOUR_ASC_APP_ID",
        "appleTeamId": "YOUR_APPLE_TEAM_ID"
      }
    }
  }
}
```

Adapt `BUNDLE_ID`, `EXPO_PUBLIC_APP_NAME`, and `EXPO_PUBLIC_API_URL` to the actual project. Use `BUNDLE_ID` (no `EXPO_PUBLIC_` prefix) for the bundle identifier - it is a build-config-only value read in `app.config.ts`, not a runtime variable. Use distinct bundle IDs per environment so multiple variants can coexist on one device.

## Step 2 - Configure EAS Secrets

Store sensitive build-time values in EAS Secrets - **never** in `.env` files committed to git.

```bash
pnpx eas secret:create --name API_KEY --value your-secret-value
```

> **Note**: `EXPO_PUBLIC_*` variables (defined in `.env` locally or in the `env` block of `eas.json` or stored as EAS Secrets) are automatically inlined into the JS bundle at build time and accessible as `process.env.EXPO_PUBLIC_*`.

Secrets can also be managed via the Expo dashboard.

## Step 3 - Configure EAS Credentials

Let EAS manage signing certificates and provisioning profiles:

```bash
pnpx eas credentials
```

This keeps builds reproducible and signing setup consistent across environments and team members.

## Step 4 - Build profiles and commands

| Profile               | Purpose                                                       | Command                                                            |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| development           | Device dev client with Metro live reload                      | `pnpx eas build --profile development --platform ios`              |
| development-simulator | iOS Simulator dev client (no provisioning needed)             | `pnpx eas build --profile development-simulator --platform ios`    |
| preview               | Internal QA / demo - APK for Android, simulator build for iOS | `pnpx eas build --profile preview --platform all`                  |
| staging               | UAT - submits to TestFlight / Play Console internal           | `pnpx eas build --profile staging --platform ios --auto-submit`    |
| production            | Public release - App Store / Play Store (AAB for Android)     | `pnpx eas build --profile production --platform ios --auto-submit` |

### When to rebuild vs reload

| Change Type                | Requires Rebuild?      |
| -------------------------- | ---------------------- |
| Editing JS/TS files        | No - reloads via Metro |
| Changing images/assets     | No - reloads via Metro |
| Updating native modules    | Yes                    |
| Modifying app.config.ts    | Yes                    |
| Changing EAS Secrets       | Yes                    |
| OTA update with EAS Update | No rebuild needed      |

## Step 5 - EAS Update (OTA)

For JavaScript-only changes that don't require a new binary:

```bash
pnpx eas update --branch production --message "Fix typo in settings screen"
```

OTA updates are delivered to users on next app launch without going through store review.

## Step 6 - Generate GitLab CI pipeline

Copy the template from `assets/templates/.gitlab-ci.yml` to `.gitlab-ci.yml` at the project root.

### Pipeline stages

| Stage           | Jobs                                                                      | Trigger                |
| --------------- | ------------------------------------------------------------------------- | ---------------------- |
| `install`       | `install` - `pnpm ci`, caches `~/.pnpm`, exposes `node_modules/` artifact | Always                 |
| `lint`          | `lint` - `type-check` + `lint`                                            | MRs, `develop`, `main` |
| `test`          | `test` - `test:coverage`, cobertura coverage artifact                     | MRs, `develop`, `main` |
| `build-ios`     | `eas-build-ios-uat`, `eas-build-ios`                                      | Tags only              |
| `build-android` | `eas-build-android-uat`, `eas-build-android`                              | Tags only              |

EAS build jobs override `before_script` to skip `pnpm ci` - EAS Cloud manages its own dependencies.

### Tag-driven release convention

| Tag pattern                | Platform | EAS profile | Submit target                |
| -------------------------- | -------- | ----------- | ---------------------------- |
| `app-store-<version>`      | iOS      | production  | App Store (--auto-submit)    |
| `uat-app-store-<version>`  | iOS      | staging     | TestFlight                   |
| `play-store-<version>`     | Android  | production  | Play Console (--auto-submit) |
| `uat-play-store-<version>` | Android  | staging     | Play Console internal        |

### CI variables required in GitLab

| Variable     | Description                                  |
| ------------ | -------------------------------------------- |
| `EXPO_TOKEN` | EAS authentication token (masked, protected) |

`EXPO_TOKEN` must be explicitly declared in each EAS job's `variables:` block (e.g., `EXPO_TOKEN: $EXPO_TOKEN`) so that `eas-cli` can authenticate. All other secrets must be stored in **EAS Secrets**, not GitLab CI variables.

> **Note**: EAS jobs use `node:alpine` as the default image. Alpine does not include `git`, which is required by `eas-cli` to detect the project root. Add `apk add --no-cache git` as the first `before_script` step in every EAS job.

## Step 7 - Health checks

Run regularly during development:

```bash
pnpx expo-doctor
pnpx expo start --clear
pnpx expo prebuild --clean
```

`expo-doctor` validates SDK compatibility, native module alignment, and missing dependencies.

## Testing: jest-expo, not Vitest

This is the one place the house runner does not apply. React Native's native
module layer is incompatible with Vitest, so Expo projects use `jest` with the
`jest-expo` preset and `@testing-library/react-native`, configured in
`jest.config.js`.

Nothing else changes: test files stay `*.test.ts` or `*.test.tsx`, they live in
the package-level `tests/` directory, and the coverage thresholds from
[rule-devops-testing](../rule-devops-testing/SKILL.md) are enforced the
same way.

## Best practices

- Set `coverageReporters: ["text", "cobertura"]` in `jest.config.js` - required for GitLab coverage reports
- Use `pnpx expo install <package>` for all Expo-compatible packages
- Keep `eas.json` profiles minimal - use `extends` for inheritance
- Use distinct bundle IDs per environment for side-by-side installs
- Never hardcode values in `app.config.ts` - read from environment variables
- Store private keys in EAS Secrets, not in `.env` or GitLab variables
- Run `expo-doctor` before SDK upgrades
- Use `--non-interactive` and `--auto-submit` flags in CI

## Edge cases

- **Simulator builds**: Add `ios.simulator: true` to the development profile for local simulator testing without device provisioning
- **Device registration**: Use `pnpx eas device:create` to register iOS test devices for internal distribution
- **Monorepo**: If the Expo app lives inside a monorepo, set `"base.node"` in eas.json and configure Metro's `watchFolders`

---

## Conventions (rules -> skills merge)

# Expo

## Dependency management

- Always use `npx expo install <package>` - never `npm install` - for any package that touches the Expo or React Native runtime. This ensures version compatibility with the current SDK.
- Pin the Expo SDK version explicitly in `package.json`.

## Managed workflow

- Stay in the managed workflow unless bare is explicitly justified.
- Never commit `ios/` or `android/` directories - they are generated by `npx expo prebuild`.
- Add `ios/`, `android/`, and `.expo/` to `.gitignore`.

## Configuration

- `app.config.ts` must be dynamic: read app name, bundle ID, and API URLs from environment variables - never hardcode them.
- Use `EXPO_PUBLIC_*` prefix only for non-sensitive values that are safe to embed in the bundle and accessed at runtime.
- Use plain env vars (no `EXPO_PUBLIC_` prefix) for build-config-only values (e.g., `BUNDLE_ID`) that are read exclusively in `app.config.ts` and must not be inlined into the JS bundle.
- `EXPO_PUBLIC_*` variables are inlined at build time and accessible directly as `process.env.EXPO_PUBLIC_*` in runtime JS/TS code.
- Use a single `src/lib/environment.ts` module as the sole runtime config access point. Components must never read `process.env` or `Constants.expoConfig` directly.
- Import `version` from `package.json` and assign it to `config.version` and `ios.buildNumber` to keep all version sources in sync.
- Always set `ios.config.usesNonExemptEncryption: false` unless the app uses custom encryption (avoids the App Store compliance questionnaire).
- Always set `developmentClient.silentLaunch: true` to prevent the development client selection dialog on app launch.
- Set `android.versionCode` as a manually incremented integer - never leave it at default when using `appVersionSource: "local"`.
- Set `experiments.typedRoutes: true` in every Expo Router project for full TypeScript route typing.
- Set `owner` to the Expo organization account that owns the EAS project.

## Secrets

- Store sensitive build-time values (API keys, signing credentials, service tokens) in **EAS Secrets** - never in `.env` files committed to git.
- `.env` files are for local development only and must be listed in `.gitignore`.
- Move truly private tokens (payment providers, analytics keys) to your backend - never embed them in the app bundle.

## EAS Build

- Define profiles in `eas.json`: `development`, `development-simulator`, `preview`, `staging`, `production`.
- Use `appVersionSource: "local"` and manage `versionCode`/`buildNumber` manually via `package.json` version.
- Add `development-simulator` profile extending `development` with `ios.simulator: true` - avoids provisioning profile requirements for local testing.
- Set `ios.resourceClass: "m-medium"` on all non-base profiles for faster EAS builds.
- Use `android.buildType: "app-bundle"` for production/staging (required for Play Store) and `"apk"` for development/preview.
- Pin `node` version in the `base` profile to ensure reproducible cloud builds.
- Use distinct bundle identifiers per environment for side-by-side installs.
- Use `--non-interactive` and `--auto-submit` flags in CI pipelines.
- Use the `expo-eas-builds` skill - not the standard `gitlab-ci` skill - for CI/CD.

## Testing

- Expo/React Native projects use `jest` + `jest-expo` + `@testing-library/react-native` - this is the explicit exception to the `testing-standards` rule that mandates Vitest (React Native's native module layer is incompatible with Vitest).
- Configure jest via `jest.config.js` using `jest-expo` preset.
- Test files follow the same `*.test.ts(x)` convention and coverage thresholds from `testing-standards`.

## Metro config

- Always extend `getDefaultConfig(__dirname)` from `expo/metro-config` as the base.
- When using Sentry: replace `getDefaultConfig` with `getSentryExpoConfig(__dirname)` from `@sentry/react-native/metro` to enable source map uploads.
- When using SVG imports: set `transformer.babelTransformerPath` to `react-native-svg-transformer`, remove `svg` from `resolver.assetExts`, and add it to `resolver.sourceExts`.
- When using Reanimated 3: wrap the final config export with `wrapWithReanimatedMetroConfig` from `react-native-reanimated/metro-config`.

## Babel config

- Use `babel-preset-expo` as the only base preset.
- `react-native-reanimated/plugin` **must be the last entry** in the `plugins` array - placing it earlier causes runtime errors.
- Always add `api.cache(true)` to the config function.

## .env.example conventions

- Separate public runtime variables (`EXPO_PUBLIC_*`) from build-only secrets with a comment separator:

```sh
# Build & runtime variables
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_ENVIRONMENT=development

# Build-only secrets (injected via EAS Secrets - never embedded in the bundle)
SENTRY_AUTH_TOKEN=
```

- Configure `expo.doctor.reactNativeDirectoryCheck` in `package.json` to suppress false positives for known third-party packages that are not in the React Native Directory.

## Health

- Run `npx expo-doctor` before SDK upgrades and periodically during development.
- Clear caches with `npx expo start --clear` or `npx expo prebuild --clean` when facing unexplained errors.

## Project structure

- Navigation and screens go in `app/` (Expo Router).
- Feature logic goes in `src/features/`.
- Shared components go in `src/components/`.
- API clients and utilities go in `src/lib/`.
- Theme tokens go in `src/theme/`.
- Root files (`app.config.ts`, `babel.config.js`, `eas.json`) are configuration only - no business logic.

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher

---
