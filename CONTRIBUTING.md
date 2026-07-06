# Contributing to http-response-kit

Thanks for your interest in contributing!

## Development setup

```bash
git clone https://github.com/matteo-teodori/http-response-kit.git
cd http-response-kit
npm install
```

Requires Node.js >= 18.

## Workflow

```bash
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint
npm test            # Vitest suite
npm run build       # tsup build (all entry points)
npm run ci          # everything, same as CI
```

## Guidelines

- **Zero runtime dependencies** is a hard constraint of this project. Framework adapters must use structural typing only.
- Public API changes require tests and a CHANGELOG entry, and must respect [SemVer](https://semver.org/).
- Security-sensitive behavior (message exposure, stack traces, metadata) must be **safe by default**; anything that widens exposure must be opt-in.
- Keep the standard envelope and the RFC 9457 output consistent with the documented schemas in `src/schemas`.

## Commit / PR conventions

- One logical change per PR.
- Describe **why**, not only what.
- CI (typecheck, lint, tests on Node 18/20/22, build) must be green.

## Releasing (maintainers)

1. Update `CHANGELOG.md` and bump `version` in `package.json`.
2. Tag: `git tag vX.Y.Z && git push --tags`.
3. The `release.yml` workflow publishes to npm with provenance.
