# SwasthaLink CI/CD Architecture

## Design Principles

- Keep workflow logic modular and reusable.
- Separate CI (quality/build) from CD (deployment orchestration).
- Make environment deployment explicit via Kubernetes overlays.
- Keep pipeline behavior observable and rollback-capable.

## Workflow Breakdown

- `ci.yml` is the lightweight CI entrypoint for pushes and pull requests.
- `ci-reusable.yml` contains reusable CI jobs for:
  - frontend quality checks (lint, format check, unit tests, build)
  - backend quality checks (lint, compile check, tests, artifact packaging)
  - optional E2E tests
  - frontend and backend Docker image builds
  - artifact upload
- `cd.yml` deploys after successful CI on `main` and also supports manual dispatch.

## Environment Strategy

- Kubernetes base manifests are in `infra/k8s/base`.
- Kustomize overlays provide environment-specific settings:
  - `infra/k8s/overlays/staging` for lower-scale staging images/replicas
  - `infra/k8s/overlays/production` for production images
- CD supports both rolling and blue-green style deployment control paths.

## Security and Secrets

- Cluster authentication is sourced from `KUBECONFIG_B64` GitHub secret.
- Secrets are injected at workflow runtime and not committed in repository files.
- Deployment environment protection can be enforced with GitHub environments.

## Observability and Reliability

- CI stores build artifacts for traceability.
- CD validates rollout status after apply.
- Production rollback hook undoes backend/frontend deployments on failed rollout.
- Backend container health check verifies `/api/health`.

## Recommended Git Workflow

- Use pull requests for all changes.
- Let CI gate merge readiness with frontend/backend quality checks.
- Keep deployment-triggering merges on `main`.
- Use manual `workflow_dispatch` in CD for controlled staging/production releases.
