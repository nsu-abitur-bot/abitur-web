# Production delivery

`Check` publishes only on a push to main after both `check` and `docker` pass.
The production digest carries the exact checked SHA as OCI revision and uses the
same GitHub Actions build cache as the Docker smoke job. PRs never publish.

Required repo secrets: DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_PRIVATE_KEY,
DEPLOY_KNOWN_HOSTS (pinned port-22 host key). Registry access uses ephemeral
GITHUB_TOKEN; no registry PAT or public package visibility is required.
The key must force `/usr/local/sbin/abitur-ci-ssh web`, with forwarding and PTY
disabled. The fixed remote command is `deploy`, with JSON credentials on stdin.

The root-owned server helper, shared deployment lock, overlay format, installation,
health checks and rollback contract are maintained in the backend repository at
`deploy/ci/README.md` and `deploy/ci/abitur_deploy.py`. No server builds occur.
The helper rechecks GitHub main inside the shared lock, preserves backend pins,
pulls before replacing the web pin, verifies OCI revision and checks local /login.
Workflow concurrency never cancels a running deployment; server handling continues
through an SSH disconnect. An old main rerun is skipped on the server.
