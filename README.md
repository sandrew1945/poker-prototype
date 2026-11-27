# poker-prototype

A small web page for a test of the on-site hand input of the Poker APP. The prototype has two pages: the on-site main screen (P06) and the hand input (P07).

The Human and 2 or 3 players use the prototype on a phone. The test measures the time of the on-site tasks. The project discards the prototype after the test.

The task card POKER-13 gives the requirements.

## Status

This repository has no prototype code at this time. The task POKER-13 adds it.

## Technology

- Use only HTML, CSS, and JavaScript.
- Do not use a package, a framework, a build step, or server code.
- The unit tests use the built-in test runner of Node.js.

## Commands

| Command | Value |
|---|---|
| Build | No build step |
| Lint | No command |
| Test | `node --test` |
| Run one test | `node --test <file>` |

The task POKER-13 adds the start procedure and the test procedure for the phone to this file.

## Branches

| Branch | Content | Made from | Merges into |
|---|---|---|---|
| `master` | The stable version | - | - |
| `dev` | The development version | `master` | `master` |
| `develop/<Task ID>` | One new feature | `dev` | `dev`, through a pull request |
| `hotfix/<Task ID>` | One fix of a bug in the stable version | `master` | `master` and `dev`, through two pull requests |

Do not commit directly to `master` or `dev`. The file `CLAUDE.md` in the workspace folder (the parent folder of this repository) gives the full rules.
