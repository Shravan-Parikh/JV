#!/usr/bin/env bash
#
# deploy.sh — ship the JV Enterprises web app to Cloud Run.
#
# The API lives in its own repository (JV-Backend) and must be deployed first,
# because its URL is compiled into this app's client bundle. This script finds
# that URL from the running jv-api service, builds against it, and then points
# the API's CORS_ORIGIN back at this app so the two ends can talk.
#
#   ./scripts/deploy.sh                          finds the API automatically
#   JV_API_URL=https://…/api ./scripts/deploy.sh  or name it explicitly
#
set -euo pipefail

REGION="${JV_REGION:-asia-south1}"        # Mumbai — closest to Silvassa
SERVICE="${JV_WEB_SERVICE:-jv-web}"
API_SERVICE="${JV_API_SERVICE:-jv-api}"

cd "$(dirname "$0")/.."

say() { printf '\n\033[1m%s\033[0m\n' "$1"; }
die() { printf '\n\033[31m✗ %s\033[0m\n\n' "$1" >&2; exit 1; }

# --- Preflight -------------------------------------------------------------

command -v gcloud >/dev/null || die "gcloud is not installed."

gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | grep -q . \
  || die "Not signed in. Run: gcloud auth login"

PROJECT="$(gcloud config get-value project 2>/dev/null)"
[ -n "$PROJECT" ] && [ "$PROJECT" != "(unset)" ] \
  || die "No project set. Run: gcloud config set project <project-id>"

# Ask Cloud Run where the API is, so the usual case needs no arguments and
# cannot be given a stale URL by hand.
#
# Which of the two hostnames gets baked in matters, and not for a reason the
# server can see. `describe` reports the opaque <service>-<hash>-<code>.a.run.app
# form, but `a.run.app` is heavily abused for phishing and appears on common
# blocklists, so ad blockers, DNS filters and some ISPs refuse it — the browser
# then fails the request before it leaves the machine, preflight included, which
# looks exactly like a CORS fault and is not one. The
# <service>-<project-number>.<region>.run.app form is the same service on a
# domain nobody filters, and is the one the web app itself is served from. So
# that is what the client bundle calls.
API_URL="${JV_API_URL:-}"
if [ -z "$API_URL" ]; then
  API_ROOT="$(gcloud run services describe "$API_SERVICE" --region "$REGION" \
    --format='value(status.url)' 2>/dev/null || true)"
  [ -n "$API_ROOT" ] || die "Could not find the '$API_SERVICE' service in $REGION.
  Deploy the API first (in the JV-Backend repo: ./scripts/deploy.sh),
  or pass its address: JV_API_URL=https://…/api ./scripts/deploy.sh"

  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)' 2>/dev/null || true)"
  if [ -n "$PROJECT_NUMBER" ]; then
    PREFERRED="https://${API_SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app"
    # Only switch to it once it actually answers, so a Cloud Run change to the
    # naming scheme degrades to the reported URL instead of breaking the build.
    if curl -fsS -m 15 -o /dev/null "${PREFERRED}/api/health" 2>/dev/null; then
      API_ROOT="$PREFERRED"
    else
      say "Note: ${PREFERRED} did not answer; falling back to ${API_ROOT}"
    fi
  fi
  API_URL="${API_ROOT}/api"
fi

say "Deploying $SERVICE against $API_URL"

# API_BASE is a RUNTIME variable, read per request by the root layout and handed
# to the browser in the page. It is deliberately not NEXT_PUBLIC_*: those are
# inlined when the bundle is built, and a `--source` deploy does not forward
# build env vars into the Dockerfile's ARGs, so that route silently shipped the
# localhost default to production. As a runtime value, repointing the app at a
# different API is an env-var update rather than a rebuild.
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --max-instances 3 \
  --memory 512Mi \
  --set-env-vars "API_BASE=${API_URL},NEXT_PUBLIC_ALLOW_SIGNUP=false" \
  --quiet

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"

# --- Let this app call the API --------------------------------------------
#
# Cloud Run serves a service on two hostnames — the opaque
# <service>-<hash>-<region-code>.a.run.app that `describe` reports, and a
# predictable <service>-<project-number>.<region>.run.app. Both are live, and
# `describe` only names the first. Whichever one gets bookmarked has to work, so
# both go into CORS; admitting only the reported one leaves the app silently
# unable to reach its API from the other.

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)' 2>/dev/null || true)"
ALT_URL=""
[ -n "$PROJECT_NUMBER" ] && ALT_URL="https://${SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app"

ORIGINS="$URL"
[ -n "$ALT_URL" ] && [ "$ALT_URL" != "$URL" ] && ORIGINS="${URL},${ALT_URL}"

CURRENT_CORS="$(gcloud run services describe "$API_SERVICE" --region "$REGION" \
  --format='value(spec.template.spec.containers[0].env.filter("name:CORS_ORIGIN").extract("value"))' 2>/dev/null || true)"

# The value comes back wrapped as a list, so compare on the origins themselves.
if ! printf '%s' "$CURRENT_CORS" | grep -qF "$URL" || { [ -n "$ALT_URL" ] && ! printf '%s' "$CURRENT_CORS" | grep -qF "$ALT_URL"; }; then
  say "Pointing the API's CORS at the web app…"
  # ^ escaped because --update-env-vars splits on commas unless told otherwise.
  gcloud run services update "$API_SERVICE" --region "$REGION" \
    --update-env-vars "^@^CORS_ORIGIN=${ORIGINS}" --quiet
fi

# Cloud Run keeps every image it has ever built, and storage is the only part of
# this that is not free. Keep the newest and drop the rest.
REPO="${REGION}-docker.pkg.dev/${PROJECT}/cloud-run-source-deploy/${SERVICE}"
for digest in $(gcloud artifacts docker images list "$REPO" --include-tags \
  --sort-by=~CREATE_TIME --format='value(version)' 2>/dev/null | tail -n +2 || true); do
  gcloud artifacts docker images delete "${REPO}@${digest}" --delete-tags --quiet >/dev/null 2>&1 || true
done

printf '\n\033[32m✓ Web app deployed\033[0m\n\n'
printf '  %s\n' "$URL"
[ -n "$ALT_URL" ] && [ "$ALT_URL" != "$URL" ] && printf '  %s   (same service, second hostname)\n' "$ALT_URL"
printf '  talking to %s\n\n' "$API_URL"
printf '  On his phone: open that URL → Share → Add to Home Screen.\n\n'
