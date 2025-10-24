# Runtime log sink

Browser modules in `/code/proto/` attempt to append JSON line entries to
`runtime-log.jsonl` using `navigator.sendBeacon` or `fetch`. When running from a
static server, hook up a simple receiver that accepts POST requests for this
path to persist the logs. Without a backend the events remain visible in the
inline runtime console and browser storage.
