# Archive

Superseded material, kept for reference only. **Nothing here is maintained or authoritative.**

## `prototype/`

A FastAPI + single-page mock built early on to demonstrate the ED screening workflow before
the real engine existed. It re-implemented the three decisions (ED Prescreen, Greenbaum, Alarm
Signs) in Python and JavaScript so it could run standalone, and included a BPMN-style process
view that highlighted as you worked through an encounter.

**Archived because** that duplicated logic is exactly what we don't want: the BPMN/DMN models in
[`../models`](../models) are the single source of truth, and the [`../service`](../service)
module (Kogito/Quarkus) executes them directly. A second hand-written implementation could only
drift from the models.

Do not extend it. For a running system, use `service/`.
