# Harper — Kogito / Quarkus service

Executes the Project Harper **BPMN** processes and **DMN** decisions on [Kogito](https://kogito.kie.org/) (Quarkus), auto-generating REST endpoints for each. This is the real-engine counterpart to the `../prototype` mock.

- **Kogito** 1.44.0.Final · **Quarkus** 2.16.10.Final · **JDK 17** · **Maven 3.8+**

The BPMN/DMN in `src/main/resources/` are copies of the canonical models in `../models`. After editing a model, re-sync:

```bash
./sync-models.sh
```

## Run (dev mode)

```bash
cd service
mvn quarkus:dev
```

- API + live reload: http://localhost:8080
- Swagger UI: http://localhost:8080/q/swagger-ui
- OpenAPI: http://localhost:8080/q/openapi
- Health: http://localhost:8080/q/health

Kogito generates one REST resource per **executable** process and one per **DMN model**. The executable processes today are the **Nurse** and **Practitioner** sub-processes; the three DMN decisions (ED Prescreen, Greenbaum, Alarm Signs) are exposed as decision endpoints. Browse the exact generated paths in Swagger UI once the app starts.

Example (shape will match the generated OpenAPI):

```bash
# Evaluate the Greenbaum decision
curl -X POST http://localhost:8080/<greenbaum-endpoint> \
  -H 'Content-Type: application/json' \
  -d '{ "historyOfSignificantTrauma": true, "historyOfAlcoholOrDrugAbuse": true, "numberOfSexualPartners": 2 }'
```

## Build & package

```bash
mvn package
java -jar target/quarkus-app/quarkus-run.jar
```

## Container image (Jib — no Dockerfile needed)

```bash
mvn package -Dquarkus.container-image.build=true
# push:  mvn package -Dquarkus.container-image.push=true
```

A JVM `Dockerfile.jvm` is also provided under `src/main/docker/` if you prefer `docker build`.

## Kubernetes

`quarkus-kubernetes` generates manifests during `mvn package`:

```bash
mvn package
kubectl apply -f target/kubernetes/kubernetes.yml
```

Deployment settings (namespace, replicas, probes) are in `src/main/resources/application.properties`.

## Known adjustments (scaffold → clean build)

These models were reconstructed for design and interoperability, not yet hardened for one engine's strict code generation. Expect a short iteration to a green build:

- **Executable flags.** Only `isExecutable="true"` processes generate endpoints (Nurse, Practitioner). The top-level collaboration and Registrar are `isExecutable="false"` (descriptive); make them executable or keep them out of codegen as needed.
- **Gateway conditions.** Sequence-flow conditions (e.g., `shouldScreen == true`) may need an explicit expression language for Kogito to evaluate them.
- **DMN business-rule binding.** The business-rule tasks reference DMN by `namespace` / `model` / `decision`; confirm Kogito resolves them (or expose DMN **Decision Services** and bind to those).
- **DMN model names with spaces** ("Screening Tool of Greenbaum", "Alarm Signs for Human Trafficking") produce awkward endpoint paths — consider renaming the DMN `name` attributes.
- **Signals & message/data.** The `Referral drafted` / `Suspect sex trafficking` signals and typed process data may need item definitions or a small Java data model to round-trip cleanly.

Work through these against `mvn quarkus:dev` output; each is a small, local fix.
