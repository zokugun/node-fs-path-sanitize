Changelog
=========

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog][keepachangelog], and this project adheres to [Semantic Versioning][semver].

[v0.2.0] | 2026-10-14
---------------------

### Security

- when sanitizing an `absolute` path, `sanitizePath()` is new rejecting the path if `.` / `..` segments are present.
- improves README with better examples, more complete API.
- add a disclaimer on `sanitizePath()` pointed out by **Vishal Suwalka**.

[v0.1.0] | 2026-05-29
---------------------

### Added

- initial release

[keepachangelog]: https://keepachangelog.com/en/2.0.0/
[semver]: https://semver.org/spec/v2.0.0.html
[unreleased]: https://github.com/zokugun/node-fs-path/compare/v0.2.0...HEAD
[v0.2.0]: https://github.com/zokugun/node-fs-path/releases/tag/v0.2.0
[v0.1.0]: https://github.com/zokugun/node-fs-path/releases/tag/v0.1.0
