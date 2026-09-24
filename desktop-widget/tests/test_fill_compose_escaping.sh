#!/bin/bash
# Checks that fill_compose.sh passes subject/body to AppleScript as data, not code.
# Uses FILL_COMPOSE_DRY_RUN so Mail/Chrome are never driven. macOS only (osascript).
# Run: bash desktop-widget/tests/test_fill_compose_escaping.sh
set -u
DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$DIR/fill_compose.sh"
export FILL_COMPOSE_DRY_RUN=1
fail=0

SUBJECT=$'Quote " apos \' back\\slash $(whoami) `id` \\" end'
BODY=$'Line 1 "x" & y\nLine 2 \'$HOME\' \\n literal\n$(touch /tmp/fill_compose_pwned)\nहिन्दी ✓'

rm -f /tmp/fill_compose_pwned

# Apple Mail: the AppleScript must receive subject/body byte-for-byte.
got=$(bash "$SCRIPT" applemail "$SUBJECT" "$BODY")
want="$SUBJECT"$'\n---8<---\n'"$BODY"
if [ "$got" == "$want" ]; then echo "PASS applemail roundtrip"
else echo "FAIL applemail roundtrip"; printf 'got:  %q\nwant: %q\n' "$got" "$want"; fail=1; fi

# Gmail: the JS handed to Chrome must be valid and decode to the exact subject.
js=$(bash "$SCRIPT" gmail "$SUBJECT" "$BODY")
if command -v node >/dev/null; then
  decoded=$(JS="$js" node -e '
    const js = process.env.JS;
    new Function(js); // must parse
    const b64 = js.match(/atob\(\x27([A-Za-z0-9+\/=]*)\x27\)/)[1];
    process.stdout.write(Buffer.from(b64, "base64").toString("utf8"));
  ') || decoded="<node error>"
  if [ "$decoded" == "$SUBJECT" ]; then echo "PASS gmail subject roundtrip"
  else echo "FAIL gmail subject roundtrip"; printf 'got:  %q\nwant: %q\n' "$decoded" "$SUBJECT"; fail=1; fi
else
  echo "SKIP gmail check (node not found)"
fi

if [ -e /tmp/fill_compose_pwned ]; then echo "FAIL command substitution executed"; fail=1; rm -f /tmp/fill_compose_pwned
else echo "PASS no command execution"; fi

exit $fail
