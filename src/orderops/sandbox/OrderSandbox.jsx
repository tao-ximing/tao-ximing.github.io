import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../a11y.js";
import { CASES, ICONS, INBOX_BOX, NODES, NODE_NAMES, STAGE, TRAIL_KEYS, WIRES, entryPath } from "./cases.js";
import { runCase } from "./choreography.js";
import { Cancelled, createRunClock } from "./runClock.js";

const MIN_SCALE = 0.62;
const NODE_KEYS = NODES.map((node) => node.key);
const idleNodes = () => Object.fromEntries(NODE_KEYS.map((key) => [key, "idle"]));
const emptyLines = () => Object.fromEntries(NODE_KEYS.map((key) => [key, []]));
const TONE_MARK = { ok: "✓", bad: "!", warn: "↻" };

/**
 * Interactive walk-through of the OrderOps pipeline: pick an order, watch it
 * travel the wires and see what every node produced.
 */
export default function OrderSandbox() {
  const systemReduced = usePrefersReducedMotion();
  const [motionChoice, setMotionChoice] = useState(null);
  const reduced = (motionChoice ?? (systemReduced ? "reduced" : "full")) === "reduced";

  const [nodeStates, setNodeStates] = useState(idleNodes);
  const [lines, setLines] = useState(emptyLines);
  const [log, setLog] = useState([]);
  const [results, setResults] = useState({});
  const [token, setTokenState] = useState({ label: "", tone: "pdf" });
  const [status, setStatus] = useState("idle");
  const [run, setRun] = useState({ key: 0, caseId: null });
  const [scale, setScale] = useState(1);

  const reducedRef = useRef(reduced);
  const scaleRef = useRef(scale);
  const clockRef = useRef(null);
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const tokenRef = useRef(null);
  const trailRefs = useRef({});
  const barRefs = useRef({});
  const rowRefs = useRef({});

  reducedRef.current = reduced;
  scaleRef.current = scale;

  useEffect(() => {
    const wrap = wrapRef.current;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, Math.max(MIN_SCALE, entry.contentRect.width / STAGE.width)));
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => clockRef.current?.cancel(), []);

  const rowY = useCallback((caseId) => {
    const row = rowRefs.current[caseId].getBoundingClientRect();
    const stage = stageRef.current.getBoundingClientRect();
    return Math.round((row.top + row.height / 2 - stage.top) / scaleRef.current);
  }, []);

  // A run starts after the commit that remounted the trails, so the
  // choreography always draws on fresh elements.
  useEffect(() => {
    const c = CASES.find((item) => item.id === run.caseId);
    if (!c) return undefined;

    const clock = createRunClock();
    clockRef.current = clock;
    stageRef.current.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());

    const view = {
      isReduced: () => reducedRef.current,
      trail: (key) => trailRefs.current[key],
      token: () => tokenRef.current,
      bar: (key) => barRefs.current[key],
      setNode: (key, state) => setNodeStates((current) => ({ ...current, [key]: state })),
      addLine: (key, line) => setLines((current) => ({ ...current, [key]: [...current[key], line] })),
      setLines: (key, next) => setLines((current) => ({ ...current, [key]: next })),
      setLineTone: (key, index, tone) =>
        setLines((current) => ({
          ...current,
          [key]: current[key].map((line, i) => (i === index ? [line[0], tone] : line)),
        })),
      log: (key, text) => setLog((current) => [...current, { key, text }]),
      setToken: (label, tone) => setTokenState({ label, tone }),
    };

    runCase(c, { clock, view }, entryPath(rowY(c.id)))
      .then(() => {
        setResults((current) => ({ ...current, [c.id]: c.result }));
        setStatus("done");
      })
      .catch((error) => {
        if (error instanceof Cancelled) return;
        console.error("OrderOps sandbox run failed", error);
        setStatus("idle");
      });

    return () => clock.cancel();
  }, [run, rowY]);

  function start(caseId) {
    clockRef.current?.cancel();
    setNodeStates(idleNodes());
    setLines(emptyLines());
    setLog([]);
    setStatus("running");
    setRun((current) => ({ key: current.key + 1, caseId }));
  }

  function togglePause() {
    const next = status === "running" ? "paused" : "running";
    clockRef.current?.setPaused(next === "paused");
    setStatus(next);
  }

  const active = status === "running" || status === "paused";

  return (
    <div className="osb" data-motion={reduced ? "reduced" : "full"}>
      <div className="sandbox-head osb-head">
        <div>
          <h1 tabIndex={-1}>Sales Order Automation</h1>
          <p>
            Pick an order from the inbox. It moves through classification, the PDF or Excel lane,
            the rule gate, and handoff, and each step shows what it produced.
          </p>
        </div>
        <div className="osb-controls">
          <div className="osb-seg" role="group" aria-label="Motion">
            <button type="button" aria-pressed={!reduced} onClick={() => setMotionChoice("full")}>
              Full motion
            </button>
            <button type="button" aria-pressed={reduced} onClick={() => setMotionChoice("reduced")}>
              Reduced
            </button>
          </div>
          <button type="button" className="osb-ctl" disabled={!active} onClick={togglePause}>
            {status === "paused" ? "Resume" : "Pause"}
          </button>
          <button type="button" className="osb-ctl" disabled={!run.caseId} onClick={() => start(run.caseId)}>
            Replay
          </button>
        </div>
      </div>

      <div className="osb-wrap" ref={wrapRef} style={{ "--s": scale }}>
        <div className="osb-sizer">
          <div className="osb-stage" ref={stageRef}>
            <Wires runKey={run.key} trailRefs={trailRefs} />

            <div className="osb-node osb-inbox" role="group" aria-labelledby="osb-t-inbox" style={INBOX_BOX}>
              <header>
                <span className="osb-kind">Email</span>
                <h3 id="osb-t-inbox">Order inbox</h3>
                <span className="osb-sub">Click an order to run it</span>
              </header>
              <ul className="osb-inbox-list">
                {CASES.map((c) => (
                  <li key={c.id}>
                    <MailRow
                      c={c}
                      current={run.caseId === c.id}
                      result={results[c.id]}
                      rowRef={(el) => {
                        rowRefs.current[c.id] = el;
                      }}
                      onRun={() => start(c.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>

            {NODES.map((node) => (
              <StageNode
                key={node.key}
                node={node}
                state={nodeStates[node.key]}
                lines={lines[node.key]}
                barRef={(el) => {
                  barRefs.current[node.key] = el;
                }}
              />
            ))}

            <div className="osb-token" ref={tokenRef} data-tone={token.tone} aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <path d={ICONS[token.tone]} />
              </svg>
              <span>{token.label}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="osb-log-wrap" aria-labelledby="osb-log-title">
        <h2 id="osb-log-title">Run log</h2>
        <ol className="osb-log" aria-live="polite">
          {log.length === 0 && <li className="osb-placeholder">Run an order to see what each step did.</li>}
          {log.map((entry, index) => (
            <li key={`${run.key}-${index}`}>
              <span className="osb-log-node">{NODE_NAMES[entry.key]}</span>
              <span>{entry.text}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Wires({ runKey, trailRefs }) {
  return (
    <svg className="osb-wires" width={STAGE.width} height={STAGE.height} viewBox={`0 0 ${STAGE.width} ${STAGE.height}`} aria-hidden="true">
      <defs>
        <marker id="osb-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path className="osb-arrow-head" d="M0 0 L8 4 L0 8 z" />
        </marker>
      </defs>
      <g>
        {Object.entries(WIRES).map(([key, d]) => (
          <path key={key} d={d} className={key === "unknown" ? "osb-wire osb-exception" : "osb-wire"} markerEnd="url(#osb-arrow)" />
        ))}
      </g>
      <g key={runKey}>
        {TRAIL_KEYS.map((key) => (
          <path
            key={key}
            d={WIRES[key] ?? WIRES.in}
            className="osb-trail"
            pathLength="1"
            ref={(el) => {
              trailRefs.current[key] = el;
            }}
          />
        ))}
      </g>
    </svg>
  );
}

function MailRow({ c, current, result, rowRef, onRun }) {
  const [text, tone] = result ?? [c.meta, undefined];
  return (
    <button
      type="button"
      className="osb-mail"
      ref={rowRef}
      aria-current={current}
      aria-label={`Run ${c.file} from ${c.customer}`}
      onClick={onRun}
    >
      <span className={`osb-ftype ${c.kind}`}>{c.kind === "pdf" ? "PDF" : "XLSX"}</span>
      <span className="osb-mail-text">
        <strong>{c.customer}</strong>
        <span>{c.file}</span>
        <span className="osb-mail-result" data-tone={tone}>
          {text}
        </span>
      </span>
    </button>
  );
}

function StageNode({ node, state, lines, barRef }) {
  const titleId = `osb-t-${node.key}`;
  const listClass = node.key === "gate" ? "osb-rules" : "osb-steps";
  return (
    <div className="osb-node" role="group" aria-labelledby={titleId} data-state={state} style={node.box}>
      <header>
        <span className="osb-kind">{node.kind}</span>
        <h3 id={titleId}>{node.title}</h3>
        <span className="osb-sub">{node.sub}</span>
      </header>
      <ul className={listClass}>
        {lines.map(([text, tone], index) => (
          <li key={`${index}-${text}`} data-tone={tone}>
            <span className="osb-ic">{TONE_MARK[tone] ?? ""}</span>
            {text}
          </li>
        ))}
      </ul>
      <div className="osb-bar">
        <i ref={barRef} />
      </div>
    </div>
  );
}
