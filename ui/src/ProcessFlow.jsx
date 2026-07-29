/**
 * BPMN-style view of the ED Encounter pathway.
 *
 * Purely presentational: it highlights based on results returned by the service.
 * It renders the same shape as models/bpmn/ed-encounter.bpmn + the sub-processes.
 */
export default function ProcessFlow({ prescreen, greenbaum, alarm, referral }) {
  const on = 'on', off = 'off', alert = 'alert'

  const sPrescreen = prescreen ? on : off
  const sScreenGate = prescreen ? on : off
  const sGreenbaum = greenbaum ? on : off
  const sRiskGate = greenbaum ? on : off
  const sDraft = referral !== 'none' ? alert : off
  const sAlarm = alarm ? on : off
  const sReferGate = alarm || referral !== 'none' ? on : off
  const sFinalize = referral === 'final' ? alert : off
  const sSignal = referral === 'final' ? alert : off
  const sSW = referral === 'final' ? alert : off
  const sContinue = prescreen && !prescreen.shouldScreen ? on : off
  const sNoRisk = greenbaum && !greenbaum.atRisk ? on : off

  const cls = (s) => (s === alert ? 'nAlert' : s === on ? 'nOn' : 'nOff')
  const ecls = (s) => (s === alert ? 'eAlert' : s === on ? 'eOn' : 'eOff')

  return (
    <div style={{ overflowX: 'auto' }}>
      <style>{`
        .nOff { opacity: .32 }
        .nOn rect, .nOn circle, .nOn path.shape { stroke: #0f766e; stroke-width: 2 }
        .nAlert rect, .nAlert circle, .nAlert path.shape { stroke: #b45309; stroke-width: 2.4; fill: #fef3e2 }
        .eOff { opacity: .25 }
        .eOn { stroke: #0f766e; stroke-width: 2 }
        .eAlert { stroke: #b45309; stroke-width: 2.4 }
        .shape { fill: #fff; stroke: #d6dee7; stroke-width: 1.5 }
        .lbl { font: 11px -apple-system, sans-serif; fill: #1f2a37 }
        .lbl2 { font: 10px -apple-system, sans-serif; fill: #5b6b7c }
        .edge { fill: none; stroke: #d6dee7; stroke-width: 1.6 }
      `}</style>
      <svg viewBox="0 0 1000 250" style={{ width: '100%', minWidth: 760, display: 'block' }}>
        <defs>
          <marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
            <path d="M0,0 L9,4.5 L0,9 z" fill="#9aacbe" />
          </marker>
        </defs>

        <text x="6" y="60" className="lbl2">Nurse</text>
        <text x="6" y="176" className="lbl2">Practitioner</text>
        <text x="812" y="150" className="lbl2">Social worker</text>

        {/* nurse lane */}
        <path className={`edge ${ecls(sPrescreen)}`} d="M62,64 L96,64" markerEnd="url(#ar)" />
        <path className={`edge ${ecls(sScreenGate)}`} d="M216,64 L244,64" markerEnd="url(#ar)" />
        <path className={`edge ${ecls(sGreenbaum)}`} d="M288,64 L318,64" markerEnd="url(#ar)" />
        <path className={`edge ${ecls(sRiskGate)}`} d="M438,64 L466,64" markerEnd="url(#ar)" />
        <path className={`edge ${ecls(sDraft)}`} d="M510,64 L560,64" markerEnd="url(#ar)" />
        <path className={`edge ${ecls(sContinue)}`} d="M266,86 L266,120" markerEnd="url(#ar)" />
        <path className={`edge ${ecls(sNoRisk)}`} d="M488,42 L488,28" markerEnd="url(#ar)" />

        {/* practitioner lane */}
        <path className={`edge ${ecls(sAlarm)}`} d="M216,180 L318,180" markerEnd="url(#ar)" />
        <path className={`edge ${ecls(sReferGate)}`} d="M438,180 L466,180" markerEnd="url(#ar)" />
        <path className={`edge ${ecls(sFinalize)}`} d="M510,180 L560,180" markerEnd="url(#ar)" />
        <path className={`edge ${ecls(sSignal)}`} d="M690,180 L730,180" markerEnd="url(#ar)" />
        <path className={`edge ${ecls(sSW)}`} d="M762,180 L806,180" markerEnd="url(#ar)" />
        {/* draft -> finalize */}
        <path className={`edge ${ecls(sDraft)}`} strokeDasharray="4 3" d="M620,86 L620,140 L622,140 L622,158" markerEnd="url(#ar)" />

        <g className={cls(sPrescreen)}>
          <circle cx="44" cy="64" r="14" className="shape" />
        </g>
        <g className={cls(sPrescreen)}>
          <rect x="96" y="43" width="120" height="42" rx="8" className="shape" />
          <text x="156" y="60" textAnchor="middle" className="lbl">ED Prescreen</text>
          <text x="156" y="74" textAnchor="middle" className="lbl2">DMN</text>
        </g>
        <g className={cls(sScreenGate)}>
          <path className="shape" d="M266,42 L288,64 L266,86 L244,64 Z" />
          <text x="266" y="34" textAnchor="middle" className="lbl2">Screen?</text>
        </g>
        <g className={cls(sGreenbaum)}>
          <rect x="318" y="43" width="120" height="42" rx="8" className="shape" />
          <text x="378" y="60" textAnchor="middle" className="lbl">Greenbaum</text>
          <text x="378" y="74" textAnchor="middle" className="lbl2">DMN</text>
        </g>
        <g className={cls(sRiskGate)}>
          <path className="shape" d="M488,42 L510,64 L488,86 L466,64 Z" />
          <text x="488" y="104" textAnchor="middle" className="lbl2">At risk?</text>
        </g>
        <g className={cls(sDraft)}>
          <rect x="560" y="43" width="120" height="42" rx="8" className="shape" />
          <text x="620" y="68" textAnchor="middle" className="lbl">Draft referral</text>
        </g>
        <g className={cls(sContinue)}>
          <circle cx="266" cy="134" r="12" className="shape" />
          <text x="266" y="160" textAnchor="middle" className="lbl2">Continue care</text>
        </g>
        <g className={cls(sNoRisk)}>
          <circle cx="488" cy="16" r="12" className="shape" />
        </g>

        <g className={cls(sAlarm)}>
          <rect x="96" y="159" width="120" height="42" rx="8" className="shape" />
          <text x="156" y="176" textAnchor="middle" className="lbl">Collect data</text>
        </g>
        <g className={cls(sAlarm)}>
          <rect x="318" y="159" width="120" height="42" rx="8" className="shape" />
          <text x="378" y="176" textAnchor="middle" className="lbl">Alarm Signs</text>
          <text x="378" y="190" textAnchor="middle" className="lbl2">DMN</text>
        </g>
        <g className={cls(sReferGate)}>
          <path className="shape" d="M488,158 L510,180 L488,202 L466,180 Z" />
          <text x="488" y="150" textAnchor="middle" className="lbl2">Refer?</text>
        </g>
        <g className={cls(sFinalize)}>
          <rect x="560" y="158" width="130" height="44" rx="8" className="shape" />
          <text x="625" y="184" textAnchor="middle" className="lbl">Finalize referral</text>
        </g>
        <g className={cls(sSignal)}>
          <circle cx="746" cy="180" r="15" className="shape" />
          <path d="M739,174 L753,174 L746,187 Z" fill={referral === 'final' ? '#b45309' : '#5b6b7c'} />
        </g>
        <g className={cls(sSW)}>
          <rect x="806" y="152" width="160" height="56" rx="10" className="shape" />
          <text x="886" y="176" textAnchor="middle" className="lbl">Social Worker</text>
          <text x="886" y="192" textAnchor="middle" className="lbl2">Investigate</text>
        </g>
      </svg>
    </div>
  )
}
