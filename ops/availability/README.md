# IROS Availability Probe

Read-only synthetic availability observer. No credentials, no writes, no automatic restarts.

## Local validation
```sh
node --check ops/availability/probe.mjs
node --test ops/availability/probe.test.mjs
```

## Authorized private runtime
Set `IROS_MONITOR_TARGETS_JSON` to a JSON array:

```json
[{"name":"n8n_staging","url":"http://n8n-staging.railway.internal:5678/healthz"}]
```

Confirm DNS and port before use. For gateway readiness, compare the JSON `status` field with `ready`; HTTP 200 with `degraded` is not sufficient.

Expected exit codes: 0 ready; 1 degraded; 2 bad configuration. The code only performs read-only HTTP GET. It does not provision a scheduler or store metrics by itself.

Deployment requires IROS governance (Policy, Action Bus, approval, evidence, verification). Run independently of the service being observed. Target availability 99.9%, RTO 60 minutes, and RPO 24 hours are unverified goals.
