# Upstream provenance

This skill is vendored from the `arcads-claude-code` skill pack.

- **Source:** https://github.com/krusemediallc/arcads-claude-code
- **Path in source:** `shared/skills/meta-ad-builder/`
- **Commit:** `0bfafb256cfce3ff4447d7ea1611a37f0af536be` (2026-07-09)
- **License:** MIT — Caleb Kruse / Kruse Media LLC. Full text in `LICENSE`.

Copied unmodified. To refresh against upstream:

```bash
git clone --depth 1 https://github.com/krusemediallc/arcads-claude-code /tmp/arcads
rsync -a --delete /tmp/arcads/shared/skills/meta-ad-builder/ .claude/skills/meta-ad-builder/ \
  --exclude LICENSE --exclude UPSTREAM.md
```

## Note on network access

The scripts here talk to `graph.facebook.com` (and `graph-video.facebook.com`
for video uploads). Some sandboxed environments block those hosts at the proxy
— a blocked call fails with `curl: (56) CONNECT tunnel failed, response 403`
and no HTTP status, which is a network-policy denial, not a Meta API error.
Run `bash scripts/check-meta-env.sh` to tell the two apart.
