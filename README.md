# oneyes-desktop-releases
Official OneYes Desktop installers and signed update manifests. No application source or credentials.

## Downloads

Open the [latest release](https://github.com/Pan-chongyu/oneyes-desktop-releases/releases/latest) and choose your system and CPU architecture. Installed clients use the signed `latest.json` (Windows/Linux) or architecture-specific Sparkle 2 appcasts (macOS).

## Release builds

The public `Build and publish desktop release` workflow checks out a version tag from the private source repository using a read-only deploy key. Application source is never committed to this repository. The workflow resolves the tag to one immutable commit shared by all builds.

Maintainers can run the workflow with an existing stable version tag such as `v0.1.23`. A scheduled check also discovers unpublished stable versions every half hour; it skips published versions. All Windows, macOS Intel, macOS Apple Silicon and Linux builds must pass before publishing an OTA release.

Signing credentials stay in Actions Secrets. The Tauri and Sparkle signing identities must remain the same so existing clients can verify updates. Build jobs only have read permissions; the final publish job uses this repository's `GITHUB_TOKEN` to upload validated installers, signatures, `latest.json`, and both macOS appcasts.
