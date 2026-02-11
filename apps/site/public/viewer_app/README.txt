/viewer_app/
Wrapper entrypoints for the canonical Viewer app served at /viewer/.

- /viewer_app/index.html -> /viewer/index.html
- /viewer_app/peek.html  -> /viewer/peek.html

This exists so other apps (e.g. premium shell) can reference a stable viewer host path
without coupling to the internal /viewer/ SSOT layout.
