# Archive — historical, not maintained

Everything in this directory is a **point-in-time record**, kept so decisions can be traced back
to their reasoning. None of it is maintained, and some of it describes infrastructure that no
longer exists — most notably the Helm chart and `k8s/` manifests, removed when TrueNAS SCALE
moved to Docker in Electric Eel (24.10). See `docs/truenas.md`.

**Do not follow instructions in these files.** Read them for history — what was believed, and
why — and check the current docs before acting.

Live documentation lives one level up in `docs/`. The current state of pilot readiness is
`docs/V1_CHECKLIST.md`.

## Why these are kept rather than deleted

They record claims and their outcomes, including where the outcomes contradicted the claims
(`CLAIM_AUDIT_2026-03-11.md` is the clearest example). Deleting them would remove the evidence
that a given assumption was tested, which is the part worth keeping — the value is not in the
plans but in what happened to them.

Deleting the whole directory is a reasonable call for someone who wants a smaller repo; git
history retains the contents either way. It has not been done unilaterally because the decision
belongs to the repository owner.
