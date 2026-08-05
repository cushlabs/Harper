/**
 * Thin client over the Kogito service.
 *
 * Endpoints are the ones Kogito generates from the models — verify any time
 * against http://localhost:8080/q/swagger-ui
 *
 *   POST /EDPrescreen          { standingOrder, highRiskChiefComplaint, ageInYears } -> { shouldScreen, ... }
 *   POST /GreenbaumScreen      { all 7 items, all required }                                          -> { atRisk, ... }
 *   POST /AlarmSigns           { seven signs }                                        -> { numberOfAlarmSigns, suspiciousFindings, ... }
 *   POST /Process_EDEncounter  { encounterId }                                        -> { id, referralStatus, atRisk, ... }
 *   GET  /Process_EDEncounter                                                          -> [ instances ]
 *   GET  /Process_EDEncounter/{id}
 *
 * NOTE: no clinical logic lives here. Every threshold and rule is evaluated by the
 * DMN/BPMN models inside the service. This file only moves JSON.
 */
const BASE = '/api'

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) {
    const msg = (data && (data.message || data.details)) || `${res.status} ${res.statusText}`
    throw new Error(`${method} ${path} failed: ${msg}`)
  }
  return data
}

export const api = {
  health: () => call('/q/health/ready'),

  // ── Decisions (DMN) ───────────────────────────────────────────────────────
  edPrescreen: (input) => call('/EDPrescreen', { method: 'POST', body: input }),
  greenbaum: (input) => call('/GreenbaumScreen', { method: 'POST', body: input }),
  alarmSigns: (input) => call('/AlarmSigns', { method: 'POST', body: input }),

  // ── Encounter orchestration (BPMN) ────────────────────────────────────────
  startEncounter: (encounterId) =>
    call('/Process_EDEncounter', { method: 'POST', body: { encounterId } }),
  listEncounters: () => call('/Process_EDEncounter'),
  getEncounter: (id) => call(`/Process_EDEncounter/${id}`)
}

/** Sample synthetic patients — presentation data only, never decision logic. */
export const PATIENTS = [
  {
    id: 'pat-ar-16f', name: 'A. R.', age: 16, sex: 'female',
    chiefComplaint: 'Abdominal pain, dehydration; bruising noted',
    standingOrder: true, highRiskChiefComplaint: true,
    greenbaum: {
      historyOfBrokenBonesOrCuts: false, historyOfKnockedUnconscious: true, historyOfRunningAway: false,
      historyOfAlcoholOrDrugAbuse: true, everInvolvedWithLawEnforcement: false,
      historyOfSTD: false, numberOfSexualPartners: 2
    },
    alarmSigns: {
      signsOfPhysicalAbuse: true, signsOfDrugAbuse: true, signsOfAnogenitalTrauma: false,
      signsOfVenerealDisease: false, evidenceOfAbuseInOutsideRecords: false,
      suspiciousBehaviorInAccompanyingAdult: true, suspiciousBehaviorOfPatient: true
    }
  },
  {
    id: 'pat-sb-15m', name: 'S. B.', age: 15, sex: 'male',
    chiefComplaint: 'Laceration to forearm',
    standingOrder: true, highRiskChiefComplaint: true,
    greenbaum: {
      historyOfBrokenBonesOrCuts: false, historyOfKnockedUnconscious: true, historyOfRunningAway: false,
      historyOfAlcoholOrDrugAbuse: false, everInvolvedWithLawEnforcement: false,
      historyOfSTD: false, numberOfSexualPartners: 0
    },
    alarmSigns: {
      signsOfPhysicalAbuse: false, signsOfDrugAbuse: false, signsOfAnogenitalTrauma: false,
      signsOfVenerealDisease: false, evidenceOfAbuseInOutsideRecords: false,
      suspiciousBehaviorInAccompanyingAdult: false, suspiciousBehaviorOfPatient: false
    }
  },
  {
    id: 'pat-mk-20f', name: 'M. K.', age: 20, sex: 'female',
    chiefComplaint: 'Ankle sprain',
    standingOrder: true, highRiskChiefComplaint: true,
    greenbaum: {
      historyOfBrokenBonesOrCuts: false, historyOfKnockedUnconscious: false, historyOfRunningAway: false,
      historyOfAlcoholOrDrugAbuse: false, everInvolvedWithLawEnforcement: false,
      historyOfSTD: false, numberOfSexualPartners: 0
    },
    alarmSigns: {
      signsOfPhysicalAbuse: false, signsOfDrugAbuse: false, signsOfAnogenitalTrauma: false,
      signsOfVenerealDisease: false, evidenceOfAbuseInOutsideRecords: false,
      suspiciousBehaviorInAccompanyingAdult: false, suspiciousBehaviorOfPatient: false
    }
  }
]

export const GREENBAUM_LABELS = {
  historyOfBrokenBonesOrCuts: 'Broken bones or cuts needing stitches (not scored \u2014 modified tool)',
  historyOfKnockedUnconscious: 'Ever knocked unconscious',
  historyOfRunningAway: 'History of running away from home',
  historyOfAlcoholOrDrugAbuse: 'History of alcohol or drug use',
  everInvolvedWithLawEnforcement: 'Involvement with law enforcement',
  historyOfSTD: 'History of sexually transmitted infection'
}

export const ALARM_LABELS = {
  signsOfPhysicalAbuse: 'Signs of physical abuse',
  signsOfDrugAbuse: 'Signs of drug abuse',
  signsOfAnogenitalTrauma: 'Signs of anogenital trauma',
  signsOfVenerealDisease: 'Signs of venereal disease',
  evidenceOfAbuseInOutsideRecords: 'Evidence of abuse in outside records',
  suspiciousBehaviorInAccompanyingAdult: 'Suspicious behavior in accompanying adult',
  suspiciousBehaviorOfPatient: 'Suspicious behavior of patient'
}
