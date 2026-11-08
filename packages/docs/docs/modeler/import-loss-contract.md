# Modeler Import Loss Contract

Status: implemented for SW-M1.

## Contract

Modeler import is tolerant: unsupported/additional source fields may be removed from the editable strict 3DSS document and retained temporarily as `import extras`.

Those extras are **not persisted** by strict Save, Save As, or Export.

Therefore:

- a document can be schema-valid while not being a lossless round-trip of the imported source;
- when import extras exist, Save/Save As/Export must require explicit acknowledgement before any output action;
- QuickCheck must surface the condition as a warning;
- cancelling the acknowledgement must perform no picker/download/write;
- the strict output format remains unchanged;
- no sidecar or schema extension is introduced by this milestone.

## Non-equivalences

```text
schema-valid != source-semantic-complete
schema-valid != lossless round-trip
import extras retained in memory != persisted extras
```

## Deferred

- extras sidecar persistence;
- automatic reinjection;
- schema extension for foreign fields.

Those require separate product/compatibility decisions.
