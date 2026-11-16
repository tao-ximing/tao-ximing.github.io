import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Database,
  FileCheck2,
  Gauge,
  GitBranch,
  MessageSquare,
  Search,
  Tags,
  UserCheck,
} from "lucide-react";
import { usePrefersReducedMotion } from "../a11y.js";
import MotionRoot, { FlightMotion } from "../shared/MotionRoot.jsx";
import { FLIGHT_ORIGIN, flightTransition } from "../shared/motion.js";
import { HoldHitButton, useLongPress } from "../shared/hold.jsx";

function LegalPipeline() {
  const [legalStep, setLegalStep] = useState(0);
  const [legalFlights, setLegalFlights] = useState([]);
  const [showEvaluationData, setShowEvaluationData] = useState(false);
  const reduce = usePrefersReducedMotion();
  const legalPositions = {
    question: { x: 64, y: 190 },
    understanding: { x: 210, y: 190 },
    match: { x: 356, y: 190 },
    postgres: { x: 502, y: 190 },
    router: { x: 648, y: 190 },
    simple: { x: 794, y: 46 },
    complex: { x: 794, y: 190 },
    ambiguous: { x: 794, y: 350 },
    response: { x: 938, y: 190 },
    evaluation: { x: 1068, y: 190 },
  };
  const evaluation = [
    ["cost", "$0.003"],
    ["latency", "1.2s"],
    ["token usage", "1.8k"],
    ["fallback rate", "tracked"],
    ["expert review outcome", "captured"],
  ];
  const evaluationReady = legalStep >= 7 && showEvaluationData;

  function resetLegalFlow() {
    setLegalStep(0);
    setLegalFlights([]);
    setShowEvaluationData(false);
  }

  function launchLegalFlight(kind, fromKey, toKey, nextStep) {
    const from = legalPositions[fromKey];
    const to = legalPositions[toKey];
    if (!from || !to) return;

    setLegalStep((current) => Math.max(current, nextStep));
    setLegalFlights((current) => [
      ...current,
      {
        id: `${kind}-${Date.now()}-${current.length}`,
        kind,
        from,
        to,
        nextStep,
      },
    ]);
  }

  function completeLegalFlight(id, nextStep) {
    setLegalFlights((current) => current.filter((flight) => flight.id !== id));
    setLegalStep((current) => Math.max(current, nextStep));
  }

  function routeFromRouter() {
    launchLegalFlight("simple", "router", "simple", 5);
    launchLegalFlight("complex", "router", "complex", 5);
    launchLegalFlight("fallback", "router", "ambiguous", 5);
  }

  return (
    <section className="legal-page">
      <div className="legal-head">
        <h1 tabIndex={-1}>Legal QA Pipeline</h1>
        <p>
          Routes legal enquiries to verified, versioned answer records instead of allowing
          free-form LLM responses.
        </p>
      </div>

      <div className="legal-shell">
        <div className={`legal-flow legal-step-${legalStep}`}>
          <div className="canvas-grid" />
          <FlightMotion>
            {legalFlights.map((flight) => (
              <LegalFlight
                flight={flight}
                key={flight.id}
                onComplete={completeLegalFlight}
                reduce={reduce}
              />
            ))}
          </FlightMotion>

          <LegalNode
            className="question-node"
            icon={<MessageSquare size={23} />}
            title="Legal Question"
            body="Can rent be increased during a fixed-term lease in NSW?"
            active={legalStep === 0}
            complete={legalStep > 0}
            onHold={() => legalStep === 0 && launchLegalFlight("question", "question", "understanding", 1)}
          />
          <LegalNode
            className="understanding-node"
            icon={<Tags size={23} />}
            title="Query Understanding"
            body=""
            active={legalStep === 1}
            complete={legalStep > 1}
            disabled={legalStep < 1}
            onHold={() => legalStep === 1 && launchLegalFlight("tags", "understanding", "match", 2)}
          >
            <LegalNodeList
              items={[
                "topic: rent increase",
                "intent: tenant rights",
                "jurisdiction: NSW",
                "uncertainty: medium",
              ]}
            />
          </LegalNode>
          <LegalNode
            className="match-node"
            icon={<Search size={23} />}
            title="Semantic Matching"
            body=""
            active={legalStep === 2}
            complete={legalStep > 2}
            disabled={legalStep < 2}
            onHold={() => legalStep === 2 && launchLegalFlight("match", "match", "postgres", 3)}
          >
            <LegalNodeList items={["ChromaDB", "similar approved questions", "confidence score"]} />
          </LegalNode>
          <LegalNode
            className="postgres-node"
            icon={<Database size={23} />}
            title="Approved Answer Retrieval"
            body=""
            active={legalStep === 3}
            complete={legalStep > 3}
            disabled={legalStep < 3}
            onHold={() => legalStep === 3 && launchLegalFlight("record", "postgres", "router", 4)}
          >
            <LegalNodeList
              items={[
                "PostgreSQL",
                "versioned legal answer",
                "source: verified content only",
              ]}
            />
          </LegalNode>
          <LegalNode
            className="router-node"
            icon={<GitBranch size={23} />}
            title="LLM Router"
            body=""
            active={legalStep === 4}
            complete={legalStep > 4}
            disabled={legalStep < 4}
            onHold={() => legalStep === 4 && routeFromRouter()}
          >
            <LegalNodeList
              items={[
                "classifies route type",
                "selects model strength",
                "blocks unsupported generation",
              ]}
            />
          </LegalNode>
          <LegalNode
            className="simple-route-node route-node"
            icon={<Bot size={23} />}
            title="Simple Route"
            body=""
            active={legalStep === 5}
            complete={legalStep > 5}
            disabled={legalStep < 5}
            onHold={() => legalStep === 5 && launchLegalFlight("answer", "simple", "response", 6)}
          >
            <LegalNodeList items={["simple query", "cheaper model", "approved record required"]} />
          </LegalNode>
          <LegalNode
            className="complex-route-node route-node"
            icon={<Bot size={23} />}
            title="Complex Route"
            body=""
            active={legalStep === 5}
            complete={legalStep > 5}
            disabled={legalStep < 5}
            onHold={() => legalStep === 5 && launchLegalFlight("answer", "complex", "response", 6)}
          >
            <LegalNodeList items={["complex/high-risk", "stronger model", "stricter response boundary"]} />
          </LegalNode>
          <LegalNode
            className="ambiguous-route-node route-node"
            icon={<UserCheck size={23} />}
            title="Ambiguous"
            body=""
            active={legalStep === 5}
            complete={legalStep > 5}
            disabled={legalStep < 5}
            onHold={() => legalStep === 5 && launchLegalFlight("fallback", "ambiguous", "evaluation", 7)}
          >
            <LegalNodeList items={["ambiguous", "unsupported risk", "human review"]} />
          </LegalNode>
          <LegalNode
            className="response-node"
            icon={<FileCheck2 size={23} />}
            title="Final Response"
            body=""
            active={legalStep === 6}
            complete={legalStep > 6}
            disabled={legalStep < 6}
            onHold={() => legalStep === 6 && launchLegalFlight("eval", "response", "evaluation", 7)}
          >
            <LegalNodeList
              items={[
                "answer assembled from approved record",
                "no unsupported legal generation",
              ]}
            />
          </LegalNode>
          <LegalNode
            className="evaluation-node"
            icon={<Gauge size={23} />}
            title="Evaluation Dashboard"
            body=""
            active={legalStep >= 7}
            disabled={legalStep < 7}
            onHold={() => legalStep >= 7 && setShowEvaluationData(true)}
          >
            <LegalNodeList
              items={[
                "cost",
                "latency",
                "token usage",
                "fallback rate",
                "expert review outcome",
              ]}
            />
          </LegalNode>
          <svg className="legal-lines" viewBox="0 0 1180 440" aria-hidden="true">
            <path className="legal-line main" d="M152 219 L170 219" />
            <path className="legal-line main" d="M298 219 L316 219" />
            <path className="legal-line main" d="M444 219 L462 219" />
            <path className="legal-line main" d="M590 219 L608 219" />
          </svg>
        </div>

        <aside className={`evaluation-panel ${evaluationReady ? "ready" : "pending"}`}>
          <div>
            <Gauge size={22} />
            <h2>LangSmith Evaluation</h2>
          </div>
          <button className="reset-flow-button" onClick={resetLegalFlow} type="button">
            Reset flow
          </button>
          {evaluationReady && (
            <>
              <dl>
                {evaluation.map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p>
                The system does not answer when retrieval confidence or jurisdiction coverage is
                insufficient.
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

function LegalNode({ active, body, children, className, complete, disabled, hint, icon, onHold, title }) {
  function runStep() {
    if (!disabled && onHold) onHold();
  }
  const hold = useLongPress(runStep);
  function activateNode(event) {
    event.preventDefault();
    if (!hold.isClickAfterHold()) runStep();
  }

  return (
    <article
      className={`legal-node ${className} ${onHold ? "interactive" : ""} ${active ? "active" : ""} ${
        complete ? "complete" : ""
      } ${disabled ? "disabled" : ""}`}
      onClick={onHold ? activateNode : undefined}
      {...(onHold ? hold.pressProps : {})}
    >
      <div className="legal-node-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {children}
      {hint && <span className="legal-node-hint">{hint}</span>}
      {onHold && <HoldHitButton label={`Run step: ${title}`} disabled={disabled} onActivate={runStep} />}
    </article>
  );
}

function LegalNodeList({ items }) {
  return (
    <ul className="legal-node-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function LegalFlight({ flight, onComplete, reduce }) {
  const meta = {
    question: { icon: <MessageSquare size={16} />, label: "Question" },
    tags: { icon: <Tags size={16} />, label: "Intent tags" },
    match: { icon: <Search size={16} />, label: "Match" },
    record: { icon: <Database size={16} />, label: "Verified record" },
    simple: { icon: <Bot size={16} />, label: "Simple" },
    complex: { icon: <Bot size={16} />, label: "Complex" },
    answer: { icon: <FileCheck2 size={16} />, label: "Answer" },
    eval: { icon: <Gauge size={16} />, label: "Metrics" },
    fallback: { icon: <UserCheck size={16} />, label: "Review" },
  }[flight.kind];

  return (
    <motion.div
      animate={{
        x: flight.to.x,
        y: flight.to.y,
        opacity: [0.92, 1, 0],
        scale: [1, 1.08, 0.78],
      }}
      className={`legal-flight ${flight.kind}`}
      initial={{
        x: flight.from.x,
        y: flight.from.y,
        opacity: 0.92,
        scale: 1,
      }}
      onAnimationComplete={() => onComplete(flight.id, flight.nextStep)}
      style={FLIGHT_ORIGIN}
      transition={flightTransition(2.7, reduce)}
    >
      {meta.icon}
      <strong>{meta.label}</strong>
    </motion.div>
  );
}

export default function LegalPipelinePage() {
  return (
    <MotionRoot>
      <LegalPipeline />
    </MotionRoot>
  );
}
