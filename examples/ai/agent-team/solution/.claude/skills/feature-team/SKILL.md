---
name: feature-team
description: Runs the spec, frontend, test and review agents as a pipeline for a new feature.
disable-model-invocation: true
---

The feature: $ARGUMENTS

You are this team's lead. Do not write code; hand the work to the subagents and follow up on the results.

1. Have `spec-writer` write `SPEC.md`. If there are open questions, ask the user, and have SPEC.md updated with the answers. Do not continue before the user approves.
2. Have `frontend-dev` implement SPEC.md.
3. Have `qa-tester` write and run the tests.
4. If `test-report.md` ends with `STATUS: FAIL`, give the report to `frontend-dev` and go back to step 3. At most 3 rounds. If it does not pass in 3 rounds, stop and show the user the failing tests.
5. Have `reviewer` review the diff. If there are findings, run `frontend-dev` and `qa-tester` for one more round.
6. Give the user a summary:
   - The changed files
   - The test result and the number of rounds
   - The reviewer's findings
   - What is still open
