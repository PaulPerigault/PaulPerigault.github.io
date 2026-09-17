export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", [
      "feat", "fix", "docs", "style", "refactor",
      "test", "chore", "ci", "perf", "revert"
    ]],
    "subject-max-length": [2, "always", 72],
    "subject-case": [2, "always", "lower-case"],
  },
  // GitHub's default squash-merge commit subject is copied verbatim from the PR title
  // (e.g. "feat: Add X (#123)"), which isn't something a contributor types as a Conventional
  // Commit at commit time and isn't checked by the PR's own commitlint run (that only lints the
  // source branch's individual commits, before the squash message exists). Ignoring it here
  // avoids a PR title's casing retroactively failing commitlint once merged.
  ignores: [(commit) => /\(#\d+\)$/.test(commit.split("\n")[0].trim())],
};
