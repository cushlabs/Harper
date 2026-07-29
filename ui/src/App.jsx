import { useEffect, useState } from 'react'
import { api, PATIENTS, GREENBAUM_LABELS, ALARM_LABELS } from './api.js'
import ProcessFlow from './ProcessFlow.jsx'

/**
 * ED clinical workstation.
 *
 * All decisions are evaluated by the Kogito service (DMN/BPMN). This component
 * collects input, calls the service, and renders what came back — it contains
 * no thresholds and no clinical rules.
 */
export default function App() {
  const [status, setStatus] = useState('checking')
  const [patient, setPatient] = useState(null)
  const [encounter, setEncounter] = useState(null)
  const [prescreen, setPrescreen] = useState(null)
  const [greenbaum, setGreenbaum] = useState(null)
  const [alarm, setAlarm] = useState(null)
  const [gbInput, setGbInput] = useState(null)
  const [asInput, setAsInput] = useState(null)
  const [referral, setReferral] = useState('none')   // none | draft | final
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.health().then(() => setStatus('up')).catch(() => setStatus('down'))
  }, [])

  const log = (text, alert = false) => setEvents((e) => [...e, { text, alert }])

  async function guard(fn) {
    setBusy(true); setError(null)
    try { await fn() } catch (e) { setError(e.message); log(e.message, true) } finally { setBusy(false) }
  }

  function selectPatient(p) {
    setPatient(p); setEncounter(null)
    setPrescreen(null); setGreenbaum(null); setAlarm(null)
    setGbInput({ ...p.greenbaum }); setAsInput({ ...p.alarmSigns })
    setReferral('none'); setError(null)
    setEvents([{ text: `Patient selected: ${p.name} (${p.age} y, ${p.sex})` }])
  }

  const startEncounter = () => guard(async () => {
    const inst = await api.startEncounter(`enc-${patient.id}-${Date.now()}`)
    setEncounter(inst)
    log(`ED Encounter started — instance ${inst.id} (BPMN Process_EDEncounter)`)
  })

  const runPrescreen = () => guard(async () => {
    const out = await api.edPrescreen({
      standingOrder: patient.standingOrder,
      highRiskChiefComplaint: patient.highRiskChiefComplaint,
      ageInYears: patient.age
    })
    setPrescreen(out)
    log(`DMN EDPrescreen → shouldScreen = ${out.shouldScreen}`, !!out.shouldScreen)
  })

  const runGreenbaum = () => guard(async () => {
    const out = await api.greenbaum(gbInput)
    setGreenbaum(out)
    log(`DMN GreenbaumScreen → atRisk = ${out.atRisk}`, !!out.atRisk)
    if (out.atRisk) { setReferral('draft'); log('Draft referral raised — pending practitioner finalization', true) }
  })

  const runAlarm = () => guard(async () => {
    const out = await api.alarmSigns(asInput)
    setAlarm(out)
    log(`DMN AlarmSigns → ${out.numberOfAlarmSigns} sign(s), suspicious = ${out.suspiciousFindings}`, !!out.suspiciousFindings)
    if (out.suspiciousFindings && referral !== 'final') {
      setReferral('draft'); log('Draft referral raised — pending practitioner finalization', true)
    }
  })

  const finalize = () => guard(async () => {
    setReferral('final')
    log("Practitioner finalized referral → 'Suspect sex trafficking' signal → Social Worker worklist", true)
  })

  const setGb = (k, v) => setGbInput((s) => ({ ...s, [k]: v }))
  const setAs = (k, v) => setAsInput((s) => ({ ...s, [k]: v }))

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Project Harper — ED Clinical Workstation</h1>
          <div className="sub">Screening decisions executed by the Kogito service (BPMN + DMN)</div>
        </div>
        <div className={`badge ${status === 'up' ? 'ok' : status === 'down' ? 'err' : ''}`}>
          {status === 'up' ? 'Service: connected' : status === 'down' ? 'Service: unreachable' : 'Service: checking…'}
        </div>
      </header>

      <div className="disclaimer">
        <strong>Synthetic data — not for clinical use.</strong> This UI holds no clinical logic: every
        threshold and rule lives in the BPMN/DMN models and is evaluated server-side. A positive screen
        raises a <em>draft</em> referral that a licensed practitioner must finalize before it routes.
      </div>

      {status === 'down' && (
        <div className="banner risk">
          Can’t reach the service. Start it with <code>cd service &amp;&amp; mvn quarkus:dev</code>, then reload.
        </div>
      )}

      <div className="grid">
        <div>
          <div className="panel">
            <h2><span className="step">1</span>Select patient</h2>
            {PATIENTS.map((p) => (
              <div key={p.id} className={`pt ${patient?.id === p.id ? 'sel' : ''}`} onClick={() => selectPatient(p)}>
                <div className="nm">{p.name}</div>
                <div className="meta">{p.age} y · {p.sex} · {p.chiefComplaint}</div>
              </div>
            ))}
            {patient && (
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn" onClick={startEncounter} disabled={busy || !!encounter}>
                  {encounter ? 'Encounter started' : 'Start ED encounter'}
                </button>
              </div>
            )}
            {encounter && <div className="kv" style={{ marginTop: 8 }}>Instance <code>{encounter.id}</code></div>}
          </div>
        </div>

        <div>
          <div className="panel">
            <h2><span className="step">2</span>Nurse workstation</h2>
            {!patient && <div className="kv">Select a patient to begin.</div>}
            {patient && (
              <>
                <div className="kv">
                  <strong>{patient.name}</strong> — {patient.age} y, {patient.sex}. {patient.chiefComplaint}.
                  {' '}Standing order: {patient.standingOrder ? 'yes' : 'no'} · High-risk complaint: {patient.highRiskChiefComplaint ? 'yes' : 'no'}.
                </div>
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn" onClick={runPrescreen} disabled={busy}>Run ED Prescreen (DMN)</button>
                </div>
                {prescreen && (
                  <div className={`banner ${prescreen.shouldScreen ? 'risk' : 'muted'}`}>
                    ED Prescreen: shouldScreen = {String(prescreen.shouldScreen).toUpperCase()}
                    {!prescreen.shouldScreen && ' — screening not indicated for this patient'}
                  </div>
                )}

                {prescreen?.shouldScreen && gbInput && (
                  <>
                    <fieldset>
                      <legend>Greenbaum Short Screen (SSCST)</legend>
                      {Object.entries(GREENBAUM_LABELS).map(([k, label]) => (
                        <label className="chk" key={k}>
                          <input type="checkbox" checked={!!gbInput[k]} onChange={(e) => setGb(k, e.target.checked)} />
                          {label}
                        </label>
                      ))}
                      <label className="chk">
                        Number of sexual partners
                        <input type="number" min="0" className="num" value={gbInput.numberOfSexualPartners}
                               onChange={(e) => setGb('numberOfSexualPartners', Number(e.target.value))} />
                      </label>
                    </fieldset>
                    <div className="row" style={{ marginTop: 12 }}>
                      <button className="btn" onClick={runGreenbaum} disabled={busy}>Score Greenbaum (DMN)</button>
                    </div>
                    {greenbaum && (
                      <div className={`banner ${greenbaum.atRisk ? 'risk' : 'clear'}`}>
                        Greenbaum: {greenbaum.atRisk ? 'AT RISK — draft referral raised, pending practitioner finalization' : 'not at risk — continue care'}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <div className="panel">
            <h2><span className="step">3</span>Practitioner workstation</h2>
            {!patient && <div className="kv">Select a patient to begin.</div>}
            {patient && asInput && (
              <>
                <fieldset>
                  <legend>Alarm signs for human trafficking</legend>
                  {Object.entries(ALARM_LABELS).map(([k, label]) => (
                    <label className="chk" key={k}>
                      <input type="checkbox" checked={!!asInput[k]} onChange={(e) => setAs(k, e.target.checked)} />
                      {label}
                    </label>
                  ))}
                </fieldset>
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn" onClick={runAlarm} disabled={busy}>Evaluate Alarm Signs (DMN)</button>
                </div>
                {alarm && (
                  <div className={`banner ${alarm.suspiciousFindings ? 'risk' : 'clear'}`}>
                    Alarm Signs: {alarm.numberOfAlarmSigns} sign(s) — {alarm.suspiciousFindings ? 'SUSPICIOUS — draft referral raised' : 'not suspicious'}
                  </div>
                )}
              </>
            )}
          </div>

          {referral !== 'none' && (
            <div className="panel">
              <h2>Social-work referral</h2>
              {referral === 'draft' ? (
                <>
                  <div className="banner risk">
                    Draft referral — <strong>pending practitioner finalization</strong>. It does not route to
                    the Social Worker until a Licensed Independent Practitioner finalizes it.
                  </div>
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="btn" onClick={finalize} disabled={busy}>Finalize referral (practitioner)</button>
                  </div>
                </>
              ) : (
                <div className="banner clear">Referral finalized — routed to the Social Worker worklist.</div>
              )}
            </div>
          )}

          <div className="panel">
            <h2>Process flow</h2>
            <ProcessFlow
              prescreen={prescreen} greenbaum={greenbaum} alarm={alarm} referral={referral}
            />
          </div>

          <div className="panel">
            <h2>Activity</h2>
            <ul className="events">
              {events.length === 0 && <li className="muted">No activity yet.</li>}
              {events.map((e, i) => <li key={i} className={e.alert ? 'alert' : ''}>{e.text}</li>)}
            </ul>
            {error && <div className="err">{error}</div>}
            {(prescreen || greenbaum || alarm || encounter) && (
              <details className="raw">
                <summary>Raw service responses</summary>
                <pre>{JSON.stringify({ encounter, prescreen, greenbaum, alarm }, null, 2)}</pre>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
