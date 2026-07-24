import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Lock,
  MinusCircle,
  Play,
  RotateCcw,
  Sparkles,
  Ticket,
  XCircle,
  Zap,
} from "lucide-react";
import { INSPECTOR_CASES } from "./data.js";
import { DocCrop, DocumentSvg, confTone } from "./DocumentSvg.jsx";

function getStages(kase, variant) {
  return kase.variants ? kase.variants[variant].stages : kase.stages;
}

function computeStatuses(stages, done, running) {
  const firstUndone = stages.find((s) => !s.notReached && !done[s.key]);
  return stages.map((s, i) => {
    if (s.notReached) {
      const priorRunnable = stages.slice(0, i).filter((x) => !x.notReached);
      return priorRunnable.every((x) => done[x.key]) ? "notReached" : "locked";
    }
    if (done[s.key]) return "done";
    if (running === s.key) return "running";
    if (firstUndone && firstUndone.key === s.key) return "ready";
    return "locked";
  });
}

function ConfChip({ value }) {
  if (value == null) return <span className="conf-chip conf-muted">n/a</span>;
  return <span className={`conf-chip conf-${confTone(value)}`}>{value.toFixed(2)}</span>;
}

function CountUp({ from, to, duration = 900, reduce }) {
  const [val, setVal] = useState(reduce ? to : from);
  useEffect(() => {
    if (reduce) {
      setVal(to);
      return undefined;
    }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, duration, reduce]);
  return <>{val.toLocaleString("en-US")}</>;
}

function ClassifyPanel({ stage }) {
  const a = stage.artifact;
  return (
    <div className="json-block" role="group" aria-label="Classification result">
      <div>
        <span className="j-key">"documentType"</span>: <span className="j-str">"{a.documentType}"</span>,
      </div>
      <div>
        <span className="j-key">"confidence"</span>: <ConfChip value={a.confidence} />,
      </div>
      <div>
        <span className="j-key">"reasoning"</span>: <span className="j-str">"{a.reasoning}"</span>
      </div>
      {stage.stops && (
        <p className="stage-stop-note">
          <AlertTriangle size={13} />
          {stage.stops}
        </p>
      )}
    </div>
  );
}

function OcrFieldRow({ field, status, hovered, onHover, onVerify, verifyReady }) {
  const done = status === "done";
  const corrected = done && field.verify && !field.verify.response.agreesWithOcr && !field.verify.failed;
  const failed = done && field.verify?.failed;
  const shownValue = corrected ? field.verify.response.verifiedValue : field.value;
  const conf = done && field.verify ? field.verify.response.confidence : field.confidence;
  return (
    <div
      className={`ocr-row ${hovered ? "hovered" : ""}`}
      onMouseEnter={() => onHover(field.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onHover(hovered ? null : field.id)}
    >
      <span className="j-key">"{field.id}"</span>
      <span className="ocr-value">
        <span className={`j-str ${failed ? "j-failed" : ""}`}>"{shownValue}"</span>
        {corrected && <s className="ocr-was">was: "{field.value}"</s>}
      </span>
      <ConfChip value={conf} />
      {field.verify && !done && verifyReady && (
        <button className="verify-mini-btn" type="button" onClick={(e) => { e.stopPropagation(); onVerify(field.id); }}>
          {status === "running" ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
          verify
        </button>
      )}
      {field.verify && !done && !verifyReady && <span className="verify-wait">below threshold</span>}
      {failed && <span className="verify-wait failed">unrecoverable</span>}
    </div>
  );
}

function ExtractPanel({ stage, fieldStatus, hoveredId, onHover, onVerify, verifyReady }) {
  if (stage.lane === "pdf") {
    return (
      <div className="json-block ocr-json" role="group" aria-label="OCR extraction result">
        {stage.fields.map((f) => (
          <OcrFieldRow
            key={f.id}
            field={f}
            status={fieldStatus[f.id]}
            hovered={hoveredId === f.id}
            onHover={onHover}
            onVerify={onVerify}
            verifyReady={verifyReady}
          />
        ))}
      </div>
    );
  }
  const a = stage.artifact;
  return (
    <div className="excel-extract">
      <div className="json-block">
        <div>
          <span className="j-key">"templateMatch"</span>:{" "}
          <span className={a.templateMatch ? "j-str" : "j-null"}>{a.templateMatch ? `"${a.templateMatch}"` : "null"}</span>,
        </div>
        <div>
          <span className="j-key">"lane"</span>: <span className="j-str">"{a.lane}"</span>
        </div>
      </div>
      <table className="mini-table">
        <thead>
          <tr>
            <th>item_code</th>
            <th>qty</th>
            <th>unit_price</th>
          </tr>
        </thead>
        <tbody>
          {a.rows.map((row) => (
            <tr key={row.item_code}>
              <td>{row.item_code}</td>
              <td>{row.qty}</td>
              <td className={row.unit_price == null ? "cell-null" : ""}>
                {row.unit_price == null ? "null" : row.unit_price.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="panel-note">{a.note}</p>
    </div>
  );
}

function VerifyPanel({ kase, fields, fieldStatus, onVerify }) {
  const pending = fields.filter((f) => fieldStatus[f.id] !== "done").length;
  return (
    <div className="verify-panel">
      {pending > 0 && (
        <p className="verify-gate-note">
          <Lock size={13} />
          {pending} field{pending > 1 ? "s" : ""} below threshold — resolve before matching.
        </p>
      )}
      {fields.map((f) => {
        const status = fieldStatus[f.id];
        return (
          <div key={f.id} className={`verify-card ${status === "done" ? "open" : ""}`}>
            <div className="verify-card-head">
              <Sparkles size={14} />
              <strong>{f.id}</strong>
              <ConfChip value={f.confidence} />
              {status !== "done" && (
                <button className="verify-run-btn" type="button" onClick={() => onVerify(f.id)} disabled={status === "running"}>
                  {status === "running" ? (
                    <>
                      <Loader2 size={13} className="spin" /> verifying crop…
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} /> Verify with LLM
                    </>
                  )}
                </button>
              )}
              {status === "done" && (f.verify.failed ? <XCircle size={15} className="tone-red" /> : <CheckCircle2 size={15} className="tone-green" />)}
            </div>
            {status === "done" && (
              <div className="verify-card-body">
                <div className="verify-crop">
                  <span className="panel-label">Crop sent to the LLM</span>
                  <DocCrop doc={kase.document} fieldId={f.id} />
                </div>
                <div className="verify-result">
                  <span className="panel-label">Prompt</span>
                  <p className="verify-prompt">{f.verify.prompt}</p>
                  <span className="panel-label">Response</span>
                  <div className="json-block">
                    <div>
                      <span className="j-key">"verifiedValue"</span>:{" "}
                      <span className={`j-str ${f.verify.failed ? "j-failed" : ""}`}>"{f.verify.response.verifiedValue}"</span>,
                    </div>
                    <div>
                      <span className="j-key">"confidence"</span>: <ConfChip value={f.verify.response.confidence} />,
                    </div>
                    <div>
                      <span className="j-key">"agreesWithOcr"</span>:{" "}
                      <span className="j-num">{String(f.verify.response.agreesWithOcr)}</span>
                    </div>
                  </div>
                  {f.verify.note && <p className="panel-note">{f.verify.note}</p>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MatchPanel({ stage, reduce }) {
  const [settled, setSettled] = useState(reduce);
  useEffect(() => {
    if (reduce) return undefined;
    const t = window.setTimeout(() => setSettled(true), 1000);
    return () => window.clearTimeout(t);
  }, [reduce]);

  if (stage.deterministic) {
    const d = stage.deterministic;
    return (
      <div className="match-panel">
        <div className="mapping-hit">
          <span className="mapping-sender">{d.sender}</span>
          <span className="mapping-arrow">→</span>
          <span className="mapping-account">
            {d.accountId} · {d.name}
          </span>
        </div>
        <p className="panel-note">{d.note}</p>
        {stage.annotations && (
          <ul className="layer-list">
            {stage.annotations.map((a) => (
              <li key={a}>
                <Check size={13} />
                {a}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="match-panel">
      <div className="prefilter-row">
        <span className="panel-label">Pre-filter</span>
        {Object.entries(stage.prefilter.filters).map(([k, v]) => (
          <span key={k} className={`filter-chip ${String(v).startsWith("—") ? "filter-dropped" : ""}`}>
            {k}: {Array.isArray(v) ? v.join(", ") : v}
          </span>
        ))}
      </div>
      <div className="candidate-count">
        <strong>
          <CountUp from={stage.prefilter.from} to={stage.prefilter.to} reduce={reduce} />
        </strong>
        <span>candidates {stage.error ? "after degraded pre-filter" : "on the shortlist"}</span>
      </div>
      {stage.error ? (
        <motion.div
          className="loud-error"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduce ? 0 : 1.05 }}
        >
          <AlertTriangle size={16} />
          <div>
            <strong>{stage.error.title}</strong>
            <p>{stage.error.detail}</p>
            {stage.error.note && <p className="panel-note">{stage.error.note}</p>}
          </div>
        </motion.div>
      ) : (
        settled && (
          <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <table className="mini-table shortlist-table">
              <thead>
                <tr>
                  <th>account</th>
                  <th>customer</th>
                  <th>address</th>
                  <th>score</th>
                </tr>
              </thead>
              <tbody>
                {stage.shortlist.map((c) => (
                  <tr key={c.accountId} className={`${c.pick ? "row-pick" : ""} ${c.wrong ? "row-wrong" : ""} ${c.correct && !c.pick ? "row-correct-missed" : ""}`}>
                    <td>{c.accountId}</td>
                    <td>
                      {c.name}
                      {c.pick && <span className={`pick-tag ${c.wrong ? "pick-wrong" : ""}`}>{c.wrong ? "LLM pick — wrong" : "LLM pick"}</span>}
                      {c.correct && !c.pick && <span className="pick-tag pick-missed">correct answer</span>}
                    </td>
                    <td>{c.address}</td>
                    <td>{c.score.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stage.note && <p className="panel-note">{stage.note}</p>}
          </motion.div>
        )
      )}
    </div>
  );
}

const RULE_ICONS = {
  pass: <CheckCircle2 size={15} className="tone-green" />,
  fail: <XCircle size={15} className="tone-red" />,
  absent: <MinusCircle size={15} className="tone-muted" />,
};

function ValidatePanel({ stage, reduce }) {
  return (
    <div className="validate-panel">
      {stage.rules.map((rule, i) => (
        <motion.div
          key={rule.id}
          className={`rule-row rule-${rule.status}`}
          initial={reduce ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: reduce ? 0 : i * 0.14 }}
        >
          {RULE_ICONS[rule.status]}
          <div>
            <strong>{rule.label}</strong>
            <p>{rule.detail}</p>
          </div>
        </motion.div>
      ))}
      {stage.fixNote && (
        <p className="panel-note fix-note">
          <Zap size={13} />
          {stage.fixNote}
        </p>
      )}
    </div>
  );
}

function OutcomePanel({ stage }) {
  if (stage.kind === "csv" || stage.kind === "csv-error") {
    const isError = stage.kind === "csv-error";
    return (
      <div className={`outcome-csv ${isError ? "outcome-silent" : ""}`}>
        {stage.csv.banner && (
          <p className="silent-banner">
            <AlertTriangle size={14} />
            {stage.csv.banner}
          </p>
        )}
        <div className="csv-scroll">
          <table className="csv-table">
            <thead>
              <tr>
                {stage.csv.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stage.csv.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel-note">{stage.csv.note}</p>
      </div>
    );
  }
  if (stage.kind === "ticket") {
    const t = stage.ticket;
    return (
      <div className="outcome-ticket">
        <div className="ticket-head">
          <Ticket size={16} />
          <strong>{t.subject}</strong>
          <span className={`priority-chip priority-${t.priority.toLowerCase()}`}>{t.priority}</span>
        </div>
        <ul className="ticket-errors">
          {t.errors.map((e) => (
            <li key={e}>
              <XCircle size={13} />
              {e}
            </li>
          ))}
        </ul>
        <span className="panel-label">Drafted customer reply</span>
        <blockquote className="ticket-email">{t.email}</blockquote>
      </div>
    );
  }
  if (stage.kind === "error") {
    return (
      <div className="outcome-error">
        <AlertTriangle size={16} />
        <div>
          <strong>{stage.error.title}</strong>
          <p>{stage.error.detail}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="outcome-routed">
      <Check size={16} />
      <div>
        <strong>{stage.routed.title}</strong>
        <p>{stage.routed.detail}</p>
      </div>
    </div>
  );
}

function StagePanel(props) {
  const { stage } = props;
  switch (stage.key) {
    case "classify":
      return <ClassifyPanel stage={stage} />;
    case "extract":
      return <ExtractPanel {...props} />;
    case "verify":
      return <VerifyPanel kase={props.kase} fields={props.verifyFields} fieldStatus={props.fieldStatus} onVerify={props.onVerify} />;
    case "match":
      return <MatchPanel stage={stage} reduce={props.reduce} />;
    case "validate":
      return <ValidatePanel stage={stage} reduce={props.reduce} />;
    case "outcome":
      return <OutcomePanel stage={stage} />;
    default:
      return null;
  }
}

const STATUS_ICONS = {
  locked: <Lock size={13} />,
  ready: <Play size={13} />,
  running: <Loader2 size={13} className="spin" />,
  done: <Check size={13} />,
  notReached: <MinusCircle size={13} />,
};

function CaseRunner({ kase, stages }) {
  const reduce = useReducedMotion();
  const [done, setDone] = useState({});
  const [running, setRunning] = useState(null);
  const [fieldStatus, setFieldStatus] = useState({});
  const [hoveredId, setHoveredId] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const stageRefs = useRef({});
  const stateRef = useRef({});
  const autoRef = useRef(false);
  stateRef.current = { done, running, fieldStatus };

  const extractStage = stages.find((s) => s.key === "extract" && !s.notReached);
  const ocrFields = extractStage?.lane === "pdf" ? extractStage.fields : [];
  const verifyFields = ocrFields.filter((f) => f.verify);
  const verifyStage = stages.find((s) => s.key === "verify" && !s.notReached);
  const statuses = computeStatuses(stages, done, running);
  const extractDone = Boolean(done.extract);
  const verifyReady = extractDone && verifyStage && !done[verifyStage.key];

  useEffect(() => {
    if (!verifyStage || done[verifyStage.key] || !extractDone) return;
    if (verifyFields.length && verifyFields.every((f) => fieldStatus[f.id] === "done")) {
      setDone((d) => ({ ...d, [verifyStage.key]: true }));
    }
  }, [fieldStatus, extractDone, done, verifyStage, verifyFields]);

  useEffect(() => () => {
    autoRef.current = false;
  }, []);

  function runStage(stage) {
    if (stateRef.current.running) return;
    setRunning(stage.key);
    const duration = reduce ? 60 : stage.key === "extract" ? 950 : 700;
    window.setTimeout(() => {
      setDone((d) => ({ ...d, [stage.key]: true }));
      setRunning(null);
    }, duration);
  }

  function verifyField(id) {
    const current = stateRef.current.fieldStatus[id];
    if (current === "running" || current === "done") return;
    setFieldStatus((fs) => ({ ...fs, [id]: "running" }));
    window.setTimeout(() => {
      setFieldStatus((fs) => ({ ...fs, [id]: "done" }));
    }, reduce ? 60 : 850);
  }

  function reset() {
    autoRef.current = false;
    setDone({});
    setRunning(null);
    setFieldStatus({});
    setHoveredId(null);
    setCollapsed({});
  }

  async function autoRun() {
    if (autoRef.current) return;
    autoRef.current = true;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    for (let i = 0; i < 60 && autoRef.current; i++) {
      const st = stateRef.current;
      if (st.running) {
        await sleep(250);
        continue;
      }
      const currentStatuses = computeStatuses(stages, st.done, st.running);
      const readyIdx = currentStatuses.indexOf("ready");
      if (readyIdx === -1) break;
      const stage = stages[readyIdx];
      if (stage.key === "verify") {
        const next = verifyFields.find((f) => !st.fieldStatus[f.id]);
        if (next) {
          verifyField(next.id);
          await sleep(reduce ? 150 : 1500);
        } else {
          await sleep(250);
        }
      } else {
        runStage(stage);
        await sleep(reduce ? 150 : 1600);
      }
    }
    autoRef.current = false;
  }

  const doc = kase.document;
  const highlightCol = extractDone && extractStage?.highlightCol != null ? extractStage.highlightCol : null;

  return (
    <div className="inspector-body">
      <div className="inspector-doc">
        <div className="inspector-doc-head">
          <div>
            <strong>{kase.customer}</strong>
            <span className="doc-type-chip">{kase.docType}</span>
          </div>
          <span className={`case-badge badge-${kase.badge.tone}`}>{kase.badge.label}</span>
        </div>
        <DocumentSvg
          doc={doc}
          scanning={running === "extract" && doc.kind === "pdf"}
          boxesVisible={extractDone && doc.kind === "pdf"}
          fields={ocrFields}
          fieldStatus={fieldStatus}
          verifyReady={verifyReady}
          hoveredId={hoveredId}
          onHoverField={setHoveredId}
          onVerifyField={verifyField}
          highlightCol={highlightCol}
          reduce={reduce}
        />
        {!extractDone && <p className="doc-hint">Annotations appear once you run extraction.</p>}
      </div>

      <div className="inspector-stages">
        <div className="stepper-bar">
          <div className="stepper-chips" role="tablist" aria-label="Pipeline stages">
            {stages.map((s, i) => (
              <button
                key={s.key}
                type="button"
                className={`stepper-chip chip-${statuses[i]}`}
                onClick={() => stageRefs.current[s.key]?.scrollIntoView({ behavior: "smooth", block: "center" })}
              >
                {STATUS_ICONS[statuses[i]]}
                {s.title.split(" — ")[0].replace("Email ", "").replace("Customer ", "").replace(" Gate", "")}
              </button>
            ))}
          </div>
          <div className="runner-controls">
            <button className="runner-btn" type="button" onClick={autoRun}>
              <Play size={13} />
              Auto-run
            </button>
            <button className="runner-btn" type="button" onClick={reset}>
              <RotateCcw size={13} />
              Reset
            </button>
          </div>
        </div>

        {stages.map((stage, i) => {
          const status = statuses[i];
          const isCollapsed = collapsed[stage.key];
          return (
            <article
              key={stage.key}
              ref={(el) => {
                stageRefs.current[stage.key] = el;
              }}
              className={`stage-card status-${status}`}
            >
              <button
                type="button"
                className="stage-card-head"
                aria-expanded={status === "done" && !isCollapsed}
                onClick={() => {
                  if (status === "done") setCollapsed((c) => ({ ...c, [stage.key]: !c[stage.key] }));
                }}
              >
                <span className="stage-index">{String(i + 1).padStart(2, "0")}</span>
                <h4>{stage.title}</h4>
                <span className={`stage-status stage-status-${status}`}>
                  {STATUS_ICONS[status]}
                  {status === "notReached" ? "not reached" : status}
                </span>
                {status === "done" && <ChevronDown size={14} className={`stage-chevron ${isCollapsed ? "closed" : ""}`} />}
              </button>

              {status === "ready" && stage.key !== "verify" && (
                <div className="stage-card-body">
                  <p className="stage-caption">{stage.caption}</p>
                  <button className="stage-run-btn" type="button" onClick={() => runStage(stage)}>
                    <Play size={14} />
                    Run {stage.title.split(" — ")[0].toLowerCase()}
                  </button>
                </div>
              )}
              {status === "ready" && stage.key === "verify" && (
                <div className="stage-card-body">
                  <p className="stage-caption">{stage.caption}</p>
                  <StagePanel
                    stage={stage}
                    kase={kase}
                    verifyFields={verifyFields}
                    fieldStatus={fieldStatus}
                    onVerify={verifyField}
                    reduce={reduce}
                  />
                </div>
              )}
              {status === "running" && (
                <div className="stage-card-body">
                  <p className="stage-working">
                    <Loader2 size={14} className="spin" />
                    {stage.key === "extract" ? "Scanning document…" : "Working…"}
                  </p>
                </div>
              )}
              {status === "done" && !isCollapsed && (
                <div className="stage-card-body">
                  <p className="stage-caption">{stage.caption}</p>
                  <StagePanel
                    stage={stage}
                    kase={kase}
                    fieldStatus={fieldStatus}
                    hoveredId={hoveredId}
                    onHover={setHoveredId}
                    onVerify={verifyField}
                    verifyReady={verifyReady}
                    verifyFields={verifyFields}
                    reduce={reduce}
                  />
                </div>
              )}
              {status === "notReached" && (
                <div className="stage-card-body">
                  <p className="stage-not-reached">{stage.notReached}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function CasePicker({ activeId, onSelect }) {
  return (
    <div className="case-picker" role="tablist" aria-label="Mock order cases">
      {INSPECTOR_CASES.map((c) => (
        <button
          key={c.id}
          type="button"
          role="tab"
          aria-selected={activeId === c.id}
          className={`case-card ${activeId === c.id ? "active" : ""}`}
          onClick={() => onSelect(c.id)}
        >
          <div className="case-thumb">
            <DocumentSvg doc={c.document} mini />
          </div>
          <strong>{c.chipLabel}</strong>
          <span className="case-customer">
            {c.customer} · {c.docType}
          </span>
          <span className={`case-badge badge-${c.badge.tone}`}>{c.badge.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function PipelineInspector() {
  const [caseId, setCaseId] = useState(INSPECTOR_CASES[0].id);
  const [variant, setVariant] = useState("before");
  const kase = INSPECTOR_CASES.find((c) => c.id === caseId);
  const stages = getStages(kase, variant);

  return (
    <section className="inspector-section">
      <div className="inspector-head">
        <h2>Pipeline Inspector</h2>
        <p>
          Seven mock orders — successes and failures — stepped through the real pipeline stage by stage. All
          customers, accounts, and prices are fictional; the error patterns are not. Run each stage yourself, or
          hit Auto-run.
        </p>
      </div>

      <CasePicker activeId={caseId} onSelect={(id) => { setCaseId(id); setVariant("before"); }} />

      {kase.variants && (
        <div className="before-after-bar">
          <div className="before-after-toggle" role="group" aria-label="Before or after the three-layer fix">
            {["before", "after"].map((v) => (
              <button
                key={v}
                type="button"
                role="switch"
                aria-checked={variant === v}
                className={variant === v ? "active" : ""}
                onClick={() => setVariant(v)}
              >
                {kase.variants[v].label}
              </button>
            ))}
          </div>
          <p className="before-after-caption">{kase.toggleCaption}</p>
        </div>
      )}

      <CaseRunner key={`${caseId}-${variant}`} kase={kase} stages={stages} />
    </section>
  );
}
