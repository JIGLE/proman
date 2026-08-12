#!/usr/bin/env python3
"""Validate composite action manifests against GitHub's expression rules.

WHY THIS EXISTS: `yaml.safe_load` proves a manifest *parses*. It says nothing about whether
GitHub will *accept* it. That gap shipped a broken action — `${{ github.workspace }}` written
inside an input's `description`, as documentation, never intended to be evaluated — which
failed every job that used the action at load time:

    Unrecognized named-value: 'github'.
    Located at position 1 within expression: github.workspace

GitHub evaluates `${{ }}` across the whole manifest, descriptions included, and the `github`
context does not exist outside `runs:`. A "the YAML parses" check reporting success on that
file is precisely the kind of gate this repo keeps building and then finding cannot fail.

Deliberately narrow: this does not reimplement actionlint, and it enforces exactly ONE rule —
the one that has actually broken here and that is unambiguously always wrong.

A second rule was written and removed before shipping: "runtime contexts may not appear
outside `runs:`". It fired immediately on `outputs.base.value: ${{ steps.resolve.outputs.base }}`
in resolve-scan-base — which is the documented, required way to wire up a composite action's
output. Shipping a linter whose first finding is a false positive is how a gate earns the
`continue-on-error` that later makes it useless; the same false-positive problem was just
fixed in scripts/security-scan.js. If the rule cannot be stated precisely, it does not ship.

Written in Python because PyYAML is present on GitHub runners and in this repo's tooling,
whereas the `yaml` npm package is not a dependency.

    python3 scripts/check-action-manifests.py
"""

import glob
import re
import sys

import yaml

EXPR = re.compile(r"\$\{\{(.*?)\}\}", re.S)


def walk(node, path=()):
    """Yield (path, string) for every string leaf in a parsed manifest."""
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk(v, path + (str(i),))
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from walk(v, path + (str(k),))


def check(path_to_file):
    problems = []
    with open(path_to_file, encoding="utf-8") as fh:
        doc = yaml.safe_load(fh)

    for path, value in walk(doc):
        # A description is documentation. An expression there is always wrong — either GitHub
        # evaluates it (and can reject the whole manifest, as `github.workspace` did) or it is
        # prose pretending to be code. Either way it does not belong.
        if not path or path[-1] != "description":
            continue

        for match in EXPR.finditer(value):
            problems.append(
                f"${{{{ {match.group(1).strip()} }}}} inside a `description` "
                f"(at {'.'.join(path)}). GitHub evaluates this; write it as plain prose."
            )

    return problems


def main():
    files = sorted(glob.glob(".github/actions/*/action.yml"))
    if not files:
        print("No composite action manifests found.")
        return 0

    total = 0
    for f in files:
        problems = check(f)
        total += len(problems)
        for p in problems:
            print(f"  {f}: {p}", file=sys.stderr)

    if total:
        print(
            f"\n{total} problem(s). These fail at action load time, not at YAML parse time.",
            file=sys.stderr,
        )
        return 1

    print(f"{len(files)} composite action manifest(s) OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
