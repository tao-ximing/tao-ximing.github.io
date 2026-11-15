import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Inbox,
  Server,
  UserCheck,
  XCircle,
} from "lucide-react";
import PipelineInspector from "../orderops/PipelineInspector.jsx";
import { useMediaQuery, usePrefersReducedMotion } from "../a11y.js";
import MotionRoot from "../shared/MotionRoot.jsx";
import { FLIGHT_ORIGIN, STILL, flightTransition } from "../shared/motion.js";
import { HoldHitButton, keyboardClickOnly, useLongPress } from "../shared/hold.jsx";

function OrderOpsPage() {
  return (
    <MotionRoot>
      <AutomationSandbox />
      <PipelineInspector />
    </MotionRoot>
  );
}

function AutomationSandbox() {
  const isNarrowCanvas = useMediaQuery("(max-width: 980px)");
  const reduce = usePrefersReducedMotion();
  const attachmentPositions = {
    pdf: { x: 74, y: 240 },
    excel: { x: 154, y: 240 },
  };
  const nodePositions = isNarrowCanvas
    ? {
        extractionAgent: { x: 26, y: 276 },
        scripts: { x: 26, y: 476 },
        validation: { x: 26, y: 676 },
        sftp: { x: 26, y: 876 },
        human: { x: 26, y: 1076 },
      }
    : {
        extractionAgent: { x: 372, y: 44 },
        scripts: { x: 372, y: 244 },
        validation: { x: 622, y: 144 },
        sftp: { x: 872, y: 44 },
        human: { x: 872, y: 244 },
      };
  const [flights, setFlights] = useState([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [processed, setProcessed] = useState({
    pdf: false,
    excel: false,
    agentJson: false,
    scriptsJson: false,
    approved: false,
    rejected: false,
    reviewed: false,
  });

  function flightPoint(position, offset = { x: 42, y: 60 }) {
    return {
      x: position.x + offset.x,
      y: position.y + offset.y,
    };
  }

  function launchFlight({ kind, from, to, activates }) {
    if (!from || !to) return;
    if (activates) setProcessed((current) => ({ ...current, [activates]: false }));
    setFlights((current) => [
      ...current,
      {
        id: `${kind}-${Date.now()}-${current.length}`,
        kind,
        from,
        to,
        activates,
      },
    ]);
  }

  function completeFlight(id, activates) {
    setFlights((current) => current.filter((flight) => flight.id !== id));
    if (activates) setProcessed((current) => ({ ...current, [activates]: true }));
  }

  function launchAttachment(kind) {
    setHasInteracted(true);
    const route = {
      pdf: {
        to: flightPoint(nodePositions.extractionAgent),
        activates: "pdf",
      },
      excel: {
        to: flightPoint(nodePositions.scripts),
        activates: "excel",
      },
    }[kind];

    launchFlight({
      kind,
      from: attachmentPositions[kind],
      ...route,
    });
  }

  function launchJson(source) {
    const fromNode = source === "agentJson" ? nodePositions.extractionAgent : nodePositions.scripts;
    launchFlight({
      kind: "json",
      from: flightPoint(fromNode),
      to: flightPoint(nodePositions.validation),
      activates: source,
    });
  }

  function launchValidationResult(kind) {
    launchFlight({
      kind,
      from: flightPoint(nodePositions.validation, kind === "approved" ? { x: 30, y: 80 } : { x: 105, y: 80 }),
      to: kind === "approved" ? flightPoint(nodePositions.sftp) : flightPoint(nodePositions.human),
      activates: kind,
    });
  }

  function launchHumanReview() {
    launchFlight({
      kind: "reviewed",
      from: flightPoint(nodePositions.human),
      to: flightPoint(nodePositions.sftp),
      activates: "reviewed",
    });
  }

  return (
    <section className="sandbox-section">
      <div className="sandbox-head">
        <div>
          <h1 tabIndex={-1}>Sales Order Automation</h1>
          <p>
            Hold the fixed attachments and nodes to move files through extraction, validation,
            human review, and SFTP handoff.
          </p>
        </div>
      </div>

      <div className="automation-canvas">
        <div className="canvas-grid" />
        <OrderOpsFlowLines processed={processed} />
        <motion.div
          className="email-card inbox-card"
          animate={reduce ? { y: 0, rotateX: 0 } : { y: [0, -8, 0], rotateX: [0, 2, 0] }}
          transition={reduce ? STILL : { duration: 4, repeat: Infinity }}
        >
          <div className="inbox-visual" aria-hidden="true">
            <span className="inbox-icon-badge">
              <Inbox size={34} />
            </span>
          </div>
          <strong>Order inbox</strong>
          <span>Hold an attachment to route it</span>
        </motion.div>

        <FixedAttachment
          kind="pdf"
          label="PDF"
          icon={<FileText size={20} />}
          position={attachmentPositions.pdf}
          onHold={launchAttachment}
          hint={!hasInteracted}
        />
        <FixedAttachment
          kind="excel"
          label="Excel"
          icon={<FileSpreadsheet size={20} />}
          position={attachmentPositions.excel}
          onHold={launchAttachment}
          hint={!hasInteracted}
        />

        {flights.map((flight) => (
          <FlightAttachment
            key={flight.id}
            flight={flight}
            onComplete={completeFlight}
            reduce={reduce}
          />
        ))}

        <AgentNode
          className="agent-drop"
          position={nodePositions.extractionAgent}
          title="Extraction Agent"
          subtitle="PDF understanding"
          active={processed.pdf}
          onHold={() => launchJson("agentJson")}
        />
        <ScriptsNode
          position={nodePositions.scripts}
          active={processed.excel}
          onHold={() => launchJson("scriptsJson")}
        />
        <ValidationAgent
          position={nodePositions.validation}
          active={processed.agentJson || processed.scriptsJson}
          onApprove={() => launchValidationResult("approved")}
          onReject={() => launchValidationResult("rejected")}
        />
        <HumanReviewNode
          position={nodePositions.human}
          active={processed.rejected}
          onHold={launchHumanReview}
        />
        <SftpNode
          position={nodePositions.sftp}
          active={processed.approved || processed.reviewed}
        />
      </div>
      <ImpactStrip />
    </section>
  );
}

function OrderOpsFlowLines({ processed }) {
  return (
    <svg
      className={`flow-lines ${processed.approved ? "pass-active" : ""} ${
        processed.rejected ? "fail-active" : ""
      }`}
      viewBox="0 0 1120 505"
      aria-hidden="true"
    >
      <path className="flow-path" d="M252 145 C300 112 330 120 372 133" />
      <path className="flow-path" d="M252 195 C305 250 330 318 372 333" />
      <path className="flow-path" d="M562 133 C600 133 600 233 622 233" />
      <path className="flow-path" d="M562 333 C600 333 600 233 622 233" />
      <path className="flow-path pass-path" d="M812 208 C840 170 850 140 872 133" />
      <path className="flow-path fail-path" d="M812 258 C840 296 850 326 872 333" />
      <path className="flow-path review-path" d="M872 333 C830 290 830 178 872 133" />
    </svg>
  );
}

function ImpactStrip() {
  const impact = [
    { value: "95%", label: "field extraction accuracy" },
    { value: "70%", label: "eligible orders fully automated" },
    { value: "2h", label: "saved per support user/day" },
    { value: "20", label: "support users in workflow" },
  ];

  return (
    <div className="impact-strip">
      {impact.map((item) => (
        <div key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function FixedAttachment({ kind, label, icon, position, onHold, hint }) {
  const { pressProps } = useLongPress(() => onHold(kind));

  return (
    <button
      type="button"
      className={`attachment fixed-attachment hold-target ${kind} ${hint ? "hinting" : ""}`}
      style={{ left: position.x, top: position.y }}
      aria-label={`Route ${label} attachment`}
      onClick={keyboardClickOnly(() => onHold(kind))}
      {...pressProps}
    >
      {hint && <span className="hold-pulse" aria-hidden="true" />}
      {icon}
      <strong>{label}</strong>
      {hint && kind === "pdf" && (
        <span className="hold-hint" aria-hidden="true">
          Hold me
        </span>
      )}
    </button>
  );
}

function FlightAttachment({ flight, onComplete, reduce }) {
  const fileMeta = {
    pdf: { icon: <FileText size={20} />, label: "PDF" },
    excel: { icon: <FileSpreadsheet size={20} />, label: "Excel" },
    json: { icon: <FileText size={20} />, label: "JSON" },
    approved: { icon: <CheckCircle2 size={20} />, label: "Valid" },
    rejected: { icon: <XCircle size={20} />, label: "Issue" },
    reviewed: { icon: <UserCheck size={20} />, label: "Approved" },
  }[flight.kind];

  return (
    <motion.div
      className={`attachment flying-attachment ${flight.kind}`}
      style={FLIGHT_ORIGIN}
      initial={{
        x: flight.from.x,
        y: flight.from.y,
        opacity: 0.92,
        scale: 1,
        rotate: flight.kind === "pdf" ? -3 : 3,
      }}
      animate={{
        x: flight.to.x,
        y: flight.to.y,
        opacity: [0.92, 1, 0],
        scale: [1, 1.1, 0.72],
        rotate: flight.kind === "pdf" ? 10 : -10,
      }}
      transition={flightTransition(4.4, reduce)}
      onAnimationComplete={() => onComplete(flight.id, flight.activates)}
    >
      {fileMeta.icon}
      <strong>{fileMeta.label}</strong>
    </motion.div>
  );
}

function AgentNode({ className, position, title, subtitle, active, onHold }) {
  const { pressProps } = useLongPress(onHold);

  return (
    <div
      className={`processing-node target-node hold-target agent-node-card ${className} ${active ? "active" : ""}`}
      style={{ left: position.x, top: position.y }}
      {...pressProps}
    >
      <div className="pulse-ring" />
      <div className="robot-visual" aria-hidden="true">
        <span className="robot-glow" />
        <span className="robot-head">
          <Bot size={28} />
        </span>
        <span className="robot-base" />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <HoldHitButton label={`${title}: send JSON to Validation Agent`} onActivate={onHold} />
    </div>
  );
}

function ScriptsNode({ position, active, onHold }) {
  const { pressProps } = useLongPress(onHold);

  return (
    <div
      className={`scripts-node target-node hold-target ${active ? "active" : ""}`}
      style={{ left: position.x, top: position.y }}
      {...pressProps}
    >
      <div className="template-stack" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, index) => (
          <span key={index} style={{ "--i": index }} />
        ))}
      </div>
      <div>
        <h3>Extraction Script</h3>
        <p>8 extraction scripts</p>
      </div>
      <HoldHitButton label="Extraction Script: send JSON to Validation Agent" onActivate={onHold} />
    </div>
  );
}

function ValidationAgent({ position, active, onApprove, onReject }) {
  const approve = useLongPress(onApprove);
  const reject = useLongPress(onReject);

  return (
    <div
      className={`validation-agent target-node ${active ? "active" : ""}`}
      style={{ left: position.x, top: position.y }}
    >
      <div className="robot-visual compact" aria-hidden="true">
        <span className="robot-glow" />
        <span className="robot-head">
          <Bot size={24} />
        </span>
        <span className="robot-base" />
      </div>
      <div>
        <h3>Validation Agent</h3>
        <p>Schema, rules, confidence</p>
      </div>
      <div className="validation-actions">
        <button
          className="valid-action hold-target"
          type="button"
          onClick={keyboardClickOnly(onApprove)}
          {...approve.pressProps}
        >
          <CheckCircle2 size={18} />
          Pass
        </button>
        <button
          className="invalid-action hold-target"
          type="button"
          onClick={keyboardClickOnly(onReject)}
          {...reject.pressProps}
        >
          <XCircle size={18} />
          Fail
        </button>
      </div>
    </div>
  );
}

function HumanReviewNode({ position, active, onHold }) {
  const { pressProps } = useLongPress(onHold);

  return (
    <div
      className={`handoff-node human-review-node target-node hold-target ${active ? "active" : ""}`}
      style={{ left: position.x, top: position.y }}
      {...pressProps}
    >
      <div className="handoff-icon">
        <UserCheck size={27} />
      </div>
      <h3>Human Review</h3>
      <p>Approve exception</p>
      <HoldHitButton label="Human Review: approve exception and send to SFTP" onActivate={onHold} />
    </div>
  );
}

function SftpNode({ position, active }) {
  return (
    <div
      className={`handoff-node sftp-node target-node ${active ? "active" : ""}`}
      style={{ left: position.x, top: position.y }}
    >
      <div className="handoff-icon">
        <Server size={27} />
      </div>
      <h3>SFTP Server</h3>
      <p>Validated handoff</p>
    </div>
  );
}

export default OrderOpsPage;
