# Layout components

Page-level structure: `Header`, `Footer`, `Shell`, the persistent WebGL layer
host, the transition curtain.

These are the only components allowed to position themselves with `fixed`, and
the only ones that read from the z-index scale directly.
