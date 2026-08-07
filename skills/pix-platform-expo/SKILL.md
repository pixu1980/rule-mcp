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

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-architect](../rule-architect/SKILL.md) - Project architecture wizard

---
