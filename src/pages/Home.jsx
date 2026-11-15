import { useState } from "react";
import {
  ArrowRight,
  Check,
  Mail,
} from "lucide-react";
import { email, to } from "../shared/site.js";

const projects = [
  {
    id: "orderops",
    title: "Sales Order Automation",
    subtitle: "Email, PDF, and Excel orders into AX-ready workflow outputs.",
    tags: ["AI Agent", "Automation", "Document AI", "Human Review"],
    outcome:
      "95% extraction accuracy. 70% of eligible orders fully automated. 2h saved per user per day.",
    href: to("projects/orderops"),
    status: "Playable case study",
  },
  {
    id: "knowledge",
    title: "Legal QA Pipeline",
    subtitle: "Grounded legal Q&A with verified sources and controlled responses.",
    tags: ["RAG", "Source Grounding", "Evaluation"],
    outcome: "Verified answer records, confidence gates, and human fallback.",
    href: to("projects/knowledgeguard"),
    status: "Interactive pipeline",
  },
  {
    id: "clinic",
    title: "ClinicFlow",
    subtitle: "Clinician-in-the-loop assessments, exercise drafts, and patient reports.",
    tags: ["Healthcare Workflow", "Reports", "Human Review"],
    outcome: "AI-assisted workflow without replacing clinical decision-making.",
    href: to("projects/clinicflow"),
    status: "Product walkthrough",
  },
  {
    id: "docparse",
    title: "DocParse Engine",
    subtitle: "OCR, layout parsing, table detection, and structured extraction.",
    tags: ["Document AI", "OCR", "Layout Parsing"],
    outcome: "65% baseline to 92% post-processed layout accuracy.",
    href: to("projects/docparse"),
    status: "Technical foundation",
  },
];

const capabilityColumns = [
  {
    title: "Build AI Systems",
    intro:
      "I turn messy inputs such as emails, PDFs, spreadsheets, and internal knowledge into structured, validated outputs that business systems can use safely.",
    items: [
      "Applied AI and LLM workflow design",
      "Document intelligence, OCR, and layout parsing",
      "RAG systems with source control and confidence gates",
      "Structured extraction, schema validation, and evaluation",
      "Cost-aware model routing and prompt control",
    ],
  },
  {
    title: "Ship Business Automation",
    intro:
      "I connect AI outputs to business rules, approvals, exception handling, APIs, queues, databases, and human review so the system can actually run in production.",
    items: [
      "Workflow automation across email, files, tickets, and reports",
      "Human-in-the-loop review paths for risky decisions",
      "Rule engines, state transitions, and exception handling",
      "Cloud deployment with queues, containers, APIs, and databases",
      "Product-minded frontend systems for demos and operations",
    ],
  },
];

function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">Ximing Tao / AI Engineer</span>
          <h1 tabIndex={-1}>Reliable AI systems for real-world business workflows.</h1>
          <p>
            I design the AI layer, validation logic, human review paths, and integrations that
            turn messy business inputs into usable workflow actions.
          </p>
          <div className="hero-keywords" aria-label="Core focus areas">
            {["Document Intelligence", "RAG", "Workflow Automation", "Human-in-the-loop AI", "Cloud Deployment"].map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
        </div>
        <HeroProjectDeck />
      </section>

      <section className="section capabilities">
        <div className="section-heading">
          <h2>Capabilities and orchestration</h2>
          <p>A compact view of what I can design, build, validate, and ship.</p>
        </div>
        <div className="capability-grid">
          {capabilityColumns.map((column) => (
            <article key={column.title}>
              <h3>{column.title}</h3>
              <p>{column.intro}</p>
              <ul>
                {column.items.map((item) => (
                  <li key={item}>
                    <Check size={15} />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section contact-cta">
        <div>
          <h2>Want to see how I would approach your problem?</h2>
          <p>
            I am happy to walk through any of these systems live, or sketch how the same
            patterns apply to your workflow.
          </p>
        </div>
        <a className="cta-button" href={`mailto:${email}`}>
          <Mail size={16} />
          {email}
        </a>
      </section>
    </>
  );
}

function HeroProjectDeck() {
  const [activeIndex, setActiveIndex] = useState(null);

  function clearOnFocusLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) setActiveIndex(null);
  }

  return (
    <aside
      className="hero-deck"
      aria-label="Featured projects"
      onMouseLeave={() => setActiveIndex(null)}
      onBlur={clearOnFocusLeave}
    >
      {projects.map((project, index) => (
        <article
          className={`deck-card deck-card-${index + 1} ${activeIndex === index ? "active" : ""}`}
          key={project.id}
          style={{ "--i": index }}
        >
          <div className="deck-card-top">
            <span>Project {String(index + 1).padStart(2, "0")}</span>
            <ArrowRight size={16} />
          </div>
          <div className="deck-visual">
            {index === 0 ? <SandboxThumbnail /> : <BlankProjectVisual />}
          </div>
          <div className="deck-card-copy">
            <h2>
              <a className="deck-card-link" href={project.href} onFocus={() => setActiveIndex(index)}>
                {project.title}
              </a>
            </h2>
            <p>{project.subtitle}</p>
            <div className="tag-list">
              {project.tags.slice(0, 3).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <strong className="deck-outcome">{project.outcome}</strong>
          </div>
        </article>
      ))}
      {/* Pointer-only duplicates of the card links: the cards overlap on wide
          screens, so equal-width columns decide which card the mouse targets. */}
      <div className="deck-hit-zones" aria-hidden="true">
        {projects.map((project, index) => (
          <a
            href={project.href}
            key={project.id}
            onMouseEnter={() => setActiveIndex(index)}
            style={{ "--zone": index }}
            tabIndex={-1}
          />
        ))}
      </div>
    </aside>
  );
}

function ProjectCard({ project, featured }) {
  return (
    <a className={`project-card ${featured ? "featured-card" : ""} ${project.dimmed ? "dimmed" : ""}`} href={project.href}>
      <div className="project-top">
        <span>{project.status}</span>
        <ArrowRight size={16} />
      </div>
      {featured ? <SandboxThumbnail /> : <BlankProjectVisual />}
      <h3>{project.title}</h3>
      <p>{project.subtitle}</p>
      <div className="tag-list">
        {project.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      {featured && <strong>Click to play the interactive case study</strong>}
    </a>
  );
}

// Animated by CSS keyframes (thumbMailPulse, thumbPdfPath, thumbAgentGlow).
function SandboxThumbnail() {
  return (
    <div className="sandbox-thumb" aria-hidden="true">
      <span className="thumb-mail">
        <Mail size={18} />
      </span>
      <span className="thumb-pdf">PDF</span>
      <span className="thumb-agent">AI</span>
      <span className="thumb-glow" />
    </div>
  );
}

function BlankProjectVisual() {
  return (
    <div className="blank-visual" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export default HomePage;
