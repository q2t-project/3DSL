{
  "document_meta": {
    "document_title": "Phase7 invalid: bad ref",
    "document_summary": "Line endpoint ref points to missing uuid.",
    "document_uuid": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    "schema_uri": "https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json",
    "author": "phase7",
    "version": "1.1.0",
    "coordinate_system": "Z+up/freeXY",
    "units": "non_si:px"
  },
  "points": [
    {
      "meta": { "uuid": "11111111-1111-1111-1111-111111111111" },
      "appearance": { "position": [0, 0, 0], "marker": { "primitive": "sphere", "radius": 0.4 }, "visible": true }
    }
  ],
  "lines": [
    {
      "meta": { "uuid": "44444444-4444-4444-4444-444444444444" },
      "appearance": {
        "end_a": { "ref": "11111111-1111-1111-1111-111111111111" },
        "end_b": { "ref": "99999999-9999-9999-9999-999999999999" },
        "line_type": "straight",
        "visible": true
      }
    }
  ]
}
