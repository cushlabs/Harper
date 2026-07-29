"""
Project Harper — ED Human-Trafficking Detection · Prototype decision service
============================================================================
A small FastAPI service that implements the three Harper DMN decisions
(ED Prescreen, Greenbaum >=2, Alarm Signs) over sample FHIR data and emits
FHIR R4 resources (QuestionnaireResponse, RiskAssessment, Flag, Task).

This is a PROTOTYPE with synthetic data. Not for clinical use.

LICENSING: the screening items and >= 2 cutoff implemented below are clinical
content from the SSCST (Greenbaum VJ et al., PMID 26599463), NOT Apache 2.0.
Their redistribution terms have NOT been established and Project Harper claims
no license to them. Assume permission is required. Do not assume a Creative
Commons grant. See NOTICE at the repo root.

Run:
    pip install -r requirements.txt
    uvicorn app:app --reload
Then open http://localhost:8000  (API docs at http://localhost:8000/docs)
"""
from __future__ import annotations

import datetime as _dt
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Configuration — mirrors the DMN decision inputs/thresholds
# ---------------------------------------------------------------------------
VALIDATED_AGE_MIN = 13          # Greenbaum validated band (13-17)
VALIDATED_AGE_MAX = 17
GREENBAUM_CUTOFF = 2            # positive screen at >= 2 of six items
PARTNERS_THRESHOLD = 5         # ">5 partners" counts as a positive item
ALARM_SIGNS_THRESHOLD = 2      # suspicious findings at >= 2 alarm signs (configurable)

app = FastAPI(
    title="Project Harper — ED Trafficking Detection (Prototype)",
    version="0.1",
    description="Mock decision service implementing the Harper DMN logic and emitting FHIR resources.",
)

HERE = Path(__file__).parent


def _now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat()


def _uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


# ---------------------------------------------------------------------------
# Decision logic  (authoritative implementation of the three DMN models)
# ---------------------------------------------------------------------------
def ed_prescreen(standing_order: bool, high_risk_chief_complaint: bool, age_in_years: int) -> dict:
    """DMN 'ED Prescreen' (decision table, FIRST hit)."""
    in_band = VALIDATED_AGE_MIN <= age_in_years <= VALIDATED_AGE_MAX
    should_screen = bool(standing_order) and bool(high_risk_chief_complaint) and in_band
    reasons = []
    if not standing_order:
        reasons.append("no standing order for survey administration")
    if not high_risk_chief_complaint:
        reasons.append("chief complaint is not high-risk")
    if not in_band:
        reasons.append(f"age {age_in_years} outside validated band {VALIDATED_AGE_MIN}-{VALIDATED_AGE_MAX}")
    rationale = "All prescreen criteria met." if should_screen else "Not screened: " + "; ".join(reasons) + "."
    return {"shouldScreen": should_screen, "inBand": in_band, "rationale": rationale}


GREENBAUM_LABELS = {
    "significantTrauma": "History of significant trauma",
    "ranAwayFromHome": "History of running away from home",
    "alcoholOrDrugUse": "History of alcohol or drug use",
    "lawEnforcement": "Involvement with law enforcement",
    "sexuallyTransmittedInfection": "History of sexually transmitted infection",
}


def greenbaum(items: dict, number_of_partners: int) -> dict:
    """DMN 'Screening Tool of Greenbaum' — positive at >= 2 of six items."""
    contributing = [GREENBAUM_LABELS[k] for k, v in items.items() if v and k in GREENBAUM_LABELS]
    partners_positive = number_of_partners > PARTNERS_THRESHOLD
    if partners_positive:
        contributing.append(f"More than {PARTNERS_THRESHOLD} sexual partners")
    score = len(contributing)
    return {
        "score": score,
        "cutoff": GREENBAUM_CUTOFF,
        "atRisk": score >= GREENBAUM_CUTOFF,
        "contributing": contributing,
    }


ALARM_LABELS = {
    "physicalAbuse": "Signs of physical abuse",
    "drugAbuse": "Signs of drug abuse",
    "anogenitalTrauma": "Signs of anogenital trauma",
    "venerealDisease": "Signs of venereal disease",
    "evidenceInOutsideRecords": "Evidence of abuse in outside records",
    "accompanyingAdultBehavior": "Suspicious behavior in accompanying adult",
    "patientBehavior": "Suspicious behavior of patient",
}


def alarm_signs(signs: dict, threshold: int = ALARM_SIGNS_THRESHOLD) -> dict:
    """DMN 'Alarm Signs for Human Trafficking' — count + suspicious threshold."""
    present = [ALARM_LABELS[k] for k, v in signs.items() if v and k in ALARM_LABELS]
    count = len(present)
    return {
        "numberOfAlarmSigns": count,
        "threshold": threshold,
        "suspiciousFindings": count >= threshold,
        "present": present,
    }


# ---------------------------------------------------------------------------
# Minimal FHIR R4 resource builders
# ---------------------------------------------------------------------------
def fhir_risk_assessment(patient_id: str, encounter_id: str, method: str, at_risk: bool, contributing: list) -> dict:
    return {
        "resourceType": "RiskAssessment",
        "id": _uid("risk"),
        "status": "final",
        "subject": {"reference": f"Patient/{patient_id}"},
        "encounter": {"reference": f"Encounter/{encounter_id}"},
        "occurrenceDateTime": _now(),
        "method": {"text": method},
        "prediction": [{
            "outcome": {"text": "Possible child sex trafficking"},
            "qualitativeRisk": {"text": "elevated" if at_risk else "not elevated"},
        }],
        "basis": [{"display": c} for c in contributing],
        "note": [{"text": "Contributing factors: " + ("; ".join(contributing) if contributing else "none")}],
    }


def fhir_flag(patient_id: str, encounter_id: str) -> dict:
    return {
        "resourceType": "Flag",
        "id": _uid("flag"),
        "status": "active",
        "category": [{"text": "Safety"}],
        "code": {"text": "Possible human trafficking — under review"},
        "subject": {"reference": f"Patient/{patient_id}"},
        "encounter": {"reference": f"Encounter/{encounter_id}"},
        "period": {"start": _now()},
    }


def fhir_task(patient_id: str, encounter_id: str, reason: str, status: str = "draft") -> dict:
    # Referrals are created as a DRAFT proposal and remain draft until a
    # Licensed Independent Practitioner finalizes them; only then do they route.
    note = ("Draft referral — pending practitioner finalization."
            if status == "draft" else "Finalized by Licensed Independent Practitioner.")
    return {
        "resourceType": "Task",
        "id": _uid("task"),
        "status": status,
        "intent": "proposal" if status == "draft" else "order",
        "priority": "urgent",
        "code": {"text": "Social work / case management referral"},
        "description": reason,
        "for": {"reference": f"Patient/{patient_id}"},
        "encounter": {"reference": f"Encounter/{encounter_id}"},
        "authoredOn": _now(),
        "reasonCode": {"text": reason},
        "note": [{"text": note}],
    }


def fhir_questionnaire_response(patient_id: str, encounter_id: str, answers: dict) -> dict:
    return {
        "resourceType": "QuestionnaireResponse",
        "id": _uid("qr"),
        "status": "completed",
        "questionnaire": "http://harper.health/Questionnaire/greenbaum-sscst",
        "subject": {"reference": f"Patient/{patient_id}"},
        "encounter": {"reference": f"Encounter/{encounter_id}"},
        "authored": _now(),
        "item": [{"linkId": k, "answer": [{"valueBoolean" if isinstance(v, bool) else "valueInteger": v}]}
                 for k, v in answers.items()],
    }


# ---------------------------------------------------------------------------
# Sample (synthetic) patients — same set the UI uses
# ---------------------------------------------------------------------------
SAMPLE_PATIENTS = [
    {
        "id": "pat-ar-16f",
        "name": "A. R. (synthetic)",
        "age": 16, "sex": "female",
        "chiefComplaint": "Abdominal pain, dehydration; bruising noted",
        "highRiskChiefComplaint": True, "standingOrder": True,
        "greenbaum": {"significantTrauma": True, "ranAwayFromHome": False, "alcoholOrDrugUse": True,
                      "lawEnforcement": False, "sexuallyTransmittedInfection": False},
        "numberOfPartners": 2,
        "alarmSigns": {"physicalAbuse": True, "drugAbuse": True, "anogenitalTrauma": False,
                       "venerealDisease": False, "evidenceInOutsideRecords": False,
                       "accompanyingAdultBehavior": True, "patientBehavior": True},
        "note": "Expected: screened; positive Greenbaum (>=2); suspicious alarm signs.",
    },
    {
        "id": "pat-sb-15m",
        "name": "S. B. (synthetic)",
        "age": 15, "sex": "male",
        "chiefComplaint": "Laceration to forearm",
        "highRiskChiefComplaint": True, "standingOrder": True,
        "greenbaum": {"significantTrauma": True, "ranAwayFromHome": False, "alcoholOrDrugUse": False,
                      "lawEnforcement": False, "sexuallyTransmittedInfection": False},
        "numberOfPartners": 0,
        "alarmSigns": {"physicalAbuse": False, "drugAbuse": False, "anogenitalTrauma": False,
                       "venerealDisease": False, "evidenceInOutsideRecords": False,
                       "accompanyingAdultBehavior": False, "patientBehavior": False},
        "note": "Expected: screened; negative Greenbaum (1 item); no suspicious findings.",
    },
    {
        "id": "pat-mk-20f",
        "name": "M. K. (synthetic)",
        "age": 20, "sex": "female",
        "chiefComplaint": "Ankle sprain",
        "highRiskChiefComplaint": True, "standingOrder": True,
        "greenbaum": {"significantTrauma": False, "ranAwayFromHome": False, "alcoholOrDrugUse": False,
                      "lawEnforcement": False, "sexuallyTransmittedInfection": False},
        "numberOfPartners": 0,
        "alarmSigns": {k: False for k in ALARM_LABELS},
        "note": "Expected: NOT screened — age outside validated 13-17 band.",
    },
]
PATIENT_BY_ID = {p["id"]: p for p in SAMPLE_PATIENTS}


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
class PrescreenIn(BaseModel):
    standingOrder: bool = True
    highRiskChiefComplaint: bool = True
    ageInYears: int = 16


class GreenbaumIn(BaseModel):
    significantTrauma: bool = False
    ranAwayFromHome: bool = False
    alcoholOrDrugUse: bool = False
    lawEnforcement: bool = False
    sexuallyTransmittedInfection: bool = False
    numberOfPartners: int = 0
    patientId: Optional[str] = None
    encounterId: Optional[str] = None


class AlarmSignsIn(BaseModel):
    physicalAbuse: bool = False
    drugAbuse: bool = False
    anogenitalTrauma: bool = False
    venerealDisease: bool = False
    evidenceInOutsideRecords: bool = False
    accompanyingAdultBehavior: bool = False
    patientBehavior: bool = False
    threshold: int = ALARM_SIGNS_THRESHOLD
    patientId: Optional[str] = None
    encounterId: Optional[str] = None


class RunEncounterIn(BaseModel):
    patientId: str = Field(..., description="One of the sample patient ids")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
def index():
    html = (HERE / "index.html")
    if html.exists():
        return HTMLResponse(html.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>Harper prototype API</h1><p>See <a href='/docs'>/docs</a>.</p>")


@app.get("/api/patients")
def patients():
    return SAMPLE_PATIENTS


@app.post("/api/prescreen")
def api_prescreen(body: PrescreenIn):
    return ed_prescreen(body.standingOrder, body.highRiskChiefComplaint, body.ageInYears)


@app.post("/api/greenbaum")
def api_greenbaum(body: GreenbaumIn):
    items = {
        "significantTrauma": body.significantTrauma,
        "ranAwayFromHome": body.ranAwayFromHome,
        "alcoholOrDrugUse": body.alcoholOrDrugUse,
        "lawEnforcement": body.lawEnforcement,
        "sexuallyTransmittedInfection": body.sexuallyTransmittedInfection,
    }
    result = greenbaum(items, body.numberOfPartners)
    pid = body.patientId or "unknown"
    eid = body.encounterId or _uid("enc")
    answers = dict(items, numberOfPartners=body.numberOfPartners)
    resources = [fhir_questionnaire_response(pid, eid, answers),
                 fhir_risk_assessment(pid, eid, "Greenbaum SSCST", result["atRisk"], result["contributing"])]
    events = [f"DMN 'Screening Tool of Greenbaum' → score {result['score']} (cutoff {GREENBAUM_CUTOFF})"]
    if result["atRisk"]:
        resources.append(fhir_flag(pid, eid))
        resources.append(fhir_task(pid, eid, "Positive Greenbaum screen (>=2) — social work assessment proposed"))
        events.append("Draft referral (proposal) raised — pending practitioner finalization")
    else:
        events.append("Below cutoff — continue care; no referral")
    return {**result, "resources": resources, "events": events}


@app.post("/api/alarm-signs")
def api_alarm_signs(body: AlarmSignsIn):
    signs = {k: getattr(body, k) for k in ALARM_LABELS}
    result = alarm_signs(signs, body.threshold)
    pid = body.patientId or "unknown"
    eid = body.encounterId or _uid("enc")
    resources, events = [], [
        f"DMN 'Alarm Signs for Human Trafficking' → {result['numberOfAlarmSigns']} sign(s) (threshold {body.threshold})"
    ]
    if result["suspiciousFindings"]:
        resources.append(fhir_flag(pid, eid))
        resources.append(fhir_task(pid, eid, "Suspicious findings on examination — social work assessment proposed"))
        events.append("Draft referral (proposal) raised — pending practitioner finalization")
    else:
        events.append("Below threshold — continue care; no referral")
    return {**result, "resources": resources, "events": events}


@app.post("/api/run-encounter")
def run_encounter(body: RunEncounterIn):
    """Run the whole nurse + practitioner flow for a sample patient."""
    p = PATIENT_BY_ID.get(body.patientId)
    if not p:
        return JSONResponse(status_code=404, content={"error": "unknown patientId"})
    eid = _uid("enc")
    events = ["CDS Hooks: patient-view fired → eligibility check"]
    out: dict = {"patient": p, "encounterId": eid}

    pre = ed_prescreen(p["standingOrder"], p["highRiskChiefComplaint"], p["age"])
    events.append(f"DMN 'ED Prescreen' → shouldScreen={pre['shouldScreen']} ({pre['rationale']})")
    out["prescreen"] = pre

    if pre["shouldScreen"]:
        gb = greenbaum(p["greenbaum"], p["numberOfPartners"])
        gb_full = api_greenbaum(GreenbaumIn(**dict(p["greenbaum"], numberOfPartners=p["numberOfPartners"],
                                                    patientId=p["id"], encounterId=eid)))
        out["greenbaum"] = gb_full
        events += gb_full["events"]

    alarm_full = api_alarm_signs(AlarmSignsIn(**dict(p["alarmSigns"], patientId=p["id"], encounterId=eid)))
    out["alarmSigns"] = alarm_full
    events += ["Practitioner exam:"] + alarm_full["events"]

    out["events"] = events
    return out


class FinalizeIn(BaseModel):
    taskId: Optional[str] = None
    patientId: Optional[str] = None
    encounterId: Optional[str] = None


@app.post("/api/finalize-referral")
def finalize_referral(body: FinalizeIn):
    """Practitioner finalizes a draft referral, routing it to the Social Worker."""
    pid = body.patientId or "unknown"
    eid = body.encounterId or _uid("enc")
    t = fhir_task(pid, eid, "Referral finalized by practitioner — route to Social Worker", status="requested")
    if body.taskId:
        t["id"] = body.taskId
    return {"task": t, "events": ["Practitioner finalized referral → 'Suspect sex trafficking' signal thrown → routed to Social Worker worklist"]}
