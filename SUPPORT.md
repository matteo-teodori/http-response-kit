# Support & API stability policy

`http-response-kit` is meant to be adopted as a long-lived standard. This
document states what stability you can rely on.

## Semantic Versioning

The package follows [Semantic Versioning 2.0.0](https://semver.org/). Given a
version `MAJOR.MINOR.PATCH`:

- **PATCH** — bug fixes only; no observable contract change.
- **MINOR** — new, backward-compatible functionality. Existing code keeps working.
- **MAJOR** — a breaking change to the public API or the wire format.

The **public API** is everything exported from `http-response-kit` and its
documented subpaths (`/express`, `/fastify`, `/koa`, `/hono`, `/schemas`,
`/context`). Internal modules and anything marked `@internal` are not part of
the contract.

The **wire format** (the JSON shapes of success/error/problem responses) is
additionally governed by the language-agnostic [specification](spec/SPEC.md),
which carries its own version. A change that alters required output is a new
spec major.

## Stability commitments

- **No unnecessary breaking changes.** Breaking changes are a last resort, not a
  convenience.
- **Deprecation before removal.** A feature is deprecated (in code via JSDoc
  `@deprecated`, in the CHANGELOG, and in a minor release) for **at least one
  minor release and 6 months** before it can be removed in a major.
- **Migration guides.** Every major ships with a migration guide in the README
  and CHANGELOG.
- **Security fixes** are backported to the latest minor of the current major.

## Supported runtimes

- **Node.js:** the versions listed in `engines` (currently `>= 20`). We test the
  active LTS lines and Current. Dropping a Node major is a breaking change.
- **TypeScript:** the latest ecosystem-compatible release. The 7.0 native-port
  compiler will be adopted once the surrounding tooling (typescript-eslint,
  declaration bundling) supports it.

## Reporting issues

- **Bugs / features:** open a GitHub issue using the provided templates.
- **Security vulnerabilities:** follow [SECURITY.md](SECURITY.md) (private
  disclosure, 72-hour acknowledgement SLA) — do not open a public issue.
