# fe-sample-template

## Pull Request Rules

Every PR uses the [PR template](.github/pull_request_template.md). Fill in every section.

### 1. Open PRs as a draft

Always open a new PR as a **Draft**. Keep it as a draft while you are still working on it.

### 2. Add screenshots and a recording

- Attach a **recording** of the changes.
- Attach **screenshots across different screens** (mobile, tablet, desktop), with before and after where it applies.

### 3. Add the Figma designs

- Attach **screenshots of the Figma designs**.
- Paste the **Figma link** in the PR description.

### 4. Only mark as "Ready for review" when everything passes

Mark the PR as **Ready for review** only when:

- All CI checks pass (build, lint, tests)
- The recording and screenshots are attached
- The Figma screenshots and link are attached
- You have reviewed your own code and tested the changes locally

Tick each item in the **Ready for Review** checklist at the bottom of the PR description.

### How this is enforced

The [PR Ready Check](.github/workflows/pr-ready-check.yml) workflow runs on every PR:

- **Draft PRs** are skipped.
- **PRs marked Ready for review** fail the check if any item in the Ready for Review checklist is not ticked. The failure message lists what is missing.

To fix a failing check, finish the missing items and tick them in the PR description. The check runs again when you edit the description. You can also convert the PR back to a draft until you are done.

A PR cannot be merged into `main` until all required checks pass.
