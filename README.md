# oneyes-desktop-releases
Official OneYes Desktop installers and signed update manifests. No application source or credentials.

## Personalized builds

Personalized installers use the same Windows, native Intel macOS, native Apple Silicon macOS and Linux runners as the stable workflow. `node --test .github/scripts/referral-workflow.test.mjs` checks runner compatibility, signed asset inventory and stable feed isolation before a job is claimed. Keep both platform matrices aligned when runner images are retired.

The management platform can retry an approved failed job up to three build attempts, preserving its original source commit and invitation attribution. Every dispatch supplies an attempt number to both signed claim and report callbacks; callbacks from older attempts cannot update the new build. Retry through the management platform so the authorization fence and audit trail remain consistent. Personalized releases remain prereleases with `--latest=false` and do not replace stable OTA manifests or appcasts.

## Downloads

Open the [latest release](https://github.com/Pan-chongyu/oneyes-desktop-releases/releases/latest) and choose your system and CPU architecture. Installed clients use the signed `latest.json` (Windows/Linux) or architecture-specific Sparkle 2 appcasts (macOS).

## Release builds

The public `Build and publish desktop release` workflow checks out a version tag from the private source repository using a read-only deploy key. Application source is never committed to this repository. The workflow resolves the tag to one immutable commit shared by all builds.

Maintainers can run the workflow with an existing stable version tag such as `v0.1.23`. A scheduled check also discovers unpublished stable versions every half hour; it skips published versions. All Windows, macOS Intel, macOS Apple Silicon and Linux builds must pass before publishing an OTA release.

Signing credentials stay in Actions Secrets. The Tauri and Sparkle signing identities must remain the same so existing clients can verify updates. Build jobs only have read permissions; the final publish job uses this repository's `GITHUB_TOKEN` to upload validated installers, signatures, `latest.json`, and both macOS appcasts.

Each new release also includes `signing-status.json`, with package hashes and the actual publisher-signing / notarization status. OTA signatures are mandatory and are distinct from Windows Authenticode and Apple Developer ID certification. The current configuration has no Windows publisher certificate and uses macOS ad-hoc signing; these do not establish operating-system publisher trust.

Publisher signing can be enabled with repository variables `WINDOWS_SIGNING_MODE=pfx` or `MACOS_SIGNING_MODE=developer-id` after installing the required Actions Secrets. Windows requires `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`, and the pinned variable `WINDOWS_CERTIFICATE_THUMBPRINT`. macOS requires `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, and variable `APPLE_SIGNING_IDENTITY`. The private source repository's signing guide contains the configuration details. Missing or invalid signing inputs fail the build; trusted modes never silently fall back. The new signing workflow requires source v0.1.79 or newer.
