# Protecting `main` (owner only)

Goal: only the repository owner can merge into `main`; everyone else sends pull requests.

Repository settings can only be changed by the owner account (`Tanjir-Hasan`), and branch rules on a private
repository need GitHub Pro. Making the repository public removes that limit. This file is the checklist.

## 1. Import the ruleset

Settings > Rules > Rulesets > New ruleset > Import a ruleset > choose `.github/rulesets/main-protection.json`,
then set **Enforcement status** to Active.

It does this on `main`:

- Pull request required, with 1 approving review and **code owner review** (`.github/CODEOWNERS` lists the owner, so only
  the owner's approval counts).
- Stale approvals dismissed on new pushes; conversations must be resolved.
- No force pushes, no deleting the branch, linear history.
- Bypass is limited to the **Repository admin** role (the owner).

## 2. Other settings to turn on

- Settings > General > Pull Requests: allow squash merging only; auto-delete head branches.
- Settings > Collaborators: give outside people **Read** or **Triage**, not Write. Contributors use forks.
- Settings > Actions > General: "Require approval for all outside collaborators".
- Settings > Code security: enable private vulnerability reporting, secret scanning and push protection.

## 3. Checking it works

Try `git push origin main` from a non-owner account: it must be rejected. A pull request from a fork must show
"Review required" until the owner approves.
