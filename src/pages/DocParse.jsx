import { useId, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Braces,
  FileJson,
  FileText,
  Layers3,
  ScanLine,
  Table2,
} from "lucide-react";
import { handleTabListKeyDown } from "../a11y.js";

const docStages = [
  {
    id: "baseline",
    label: "Baseline",
    headline: "Cloud OCR baseline",
    layoutAccuracy: "65%",
    gain: "Baseline",
    cost: "High",
    samples: "Seed",
    note:
      "Initial parsing relied heavily on AWS Textract and struggled with dense tables, nested rows, and noisy scans.",
  },
  {
    id: "model",
    label: "Layout Model",
    headline: "PaddleOCR layout model",
    layoutAccuracy: "85%",
    gain: "+20 pts",
    cost: "-42%",
    samples: "15K",
    note:
      "A semi-automated labelling pipeline produced 15K reviewed samples for titles, paragraphs, tables, and key-value regions.",
  },
  {
    id: "post",
    label: "Post-processed",
    headline: "Rule-corrected extraction",
    layoutAccuracy: "92%",
    gain: "+27 pts",
    cost: "-60%",
    samples: "15K",
    note:
      "Structural correction aligned table rows and merged layout blocks before producing validated JSON and table output.",
  },
];

function DocParsePage() {
  const [stageIndex, setStageIndex] = useState(0);
  const stage = docStages[stageIndex];
  const tabIdPrefix = useId();
  const tabId = (item) => `${tabIdPrefix}-stage-${item.id}`;

  function runParsing() {
    setStageIndex((current) => (current + 1) % docStages.length);
  }

  return (
    <section className="docparse-page">
      <div className="docparse-head">
        <h1 tabIndex={-1}>Document Intelligence Platform</h1>
        <p>
          A PaddleOCR-based layout analysis system for complex business documents, combining
          semi-automated labelling, model training, table detection, and structural correction.
        </p>
      </div>

      <div className={`docparse-lab doc-stage-${stage.id}`}>
        <div className="canvas-grid" />
        <div className="doc-preview-panel">
          <DocumentPreview stage={stage.id} />
        </div>

        <div className="doc-process-panel">
          <div
            className="doc-stage-tabs"
            role="tablist"
            aria-label="Document parsing stage"
            onKeyDown={(event) => handleTabListKeyDown(event, setStageIndex)}
          >
            {docStages.map((item, index) => (
              <button
                aria-selected={index === stageIndex}
                id={tabId(item)}
                key={item.id}
                onClick={() => setStageIndex(index)}
                role="tab"
                tabIndex={index === stageIndex ? 0 : -1}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="doc-pipeline">
            <DocProcessNode icon={<FileText size={18} />} title="Raw Business Document" />
            <DocProcessNode icon={<ScanLine size={18} />} title="Textract-assisted Labelling" />
            <DocProcessNode icon={<Layers3 size={18} />} title="15K Training Dataset" />
            <DocProcessNode icon={<Bot size={18} />} title="PaddleOCR Layout Model" />
            <DocProcessNode icon={<Table2 size={18} />} title="Table Detector" />
            <DocProcessNode icon={<Braces size={18} />} title="Structured Output" />
          </div>

          <button className="run-parse-button" type="button" onClick={runParsing}>
            Run parsing
            <ArrowRight size={16} />
          </button>
        </div>

        <aside className="doc-eval-panel" role="tabpanel" aria-labelledby={tabId(stage)} tabIndex={0}>
          <div>
            <BarChart3 size={22} />
            <h2>{stage.headline}</h2>
          </div>
          <dl>
            <div>
              <dt>layout accuracy</dt>
              <dd>{stage.layoutAccuracy}</dd>
            </div>
            <div>
              <dt>accuracy gain</dt>
              <dd>{stage.gain}</dd>
            </div>
            <div>
              <dt>cloud API reliance</dt>
              <dd>{stage.cost}</dd>
            </div>
            <div>
              <dt>training samples</dt>
              <dd>{stage.samples}</dd>
            </div>
          </dl>
          <p>{stage.note}</p>
        </aside>
      </div>

      <div className="doc-impact-strip">
        <div>
          <strong>65% -&gt; 85% -&gt; 92%</strong>
          <span>layout accuracy progression</span>
        </div>
        <div>
          <strong>15K</strong>
          <span>labelled training samples</span>
        </div>
        <div>
          <strong>60%</strong>
          <span>less cloud API reliance</span>
        </div>
        <div>
          <strong>Post</strong>
          <span>rule-corrected layout output</span>
        </div>
      </div>
    </section>
  );
}

function DocProcessNode({ icon, title }) {
  return (
    <article>
      <span>{icon}</span>
      <strong>{title}</strong>
    </article>
  );
}

function DocumentPreview({ stage }) {
  return (
    <div className={`document-preview ${stage}`}>
      <div className="doc-paper">
        <div className="doc-title-line" />
        <div className="doc-line wide" />
        <div className="doc-line" />
        <div className="doc-line short" />
        <div className="doc-table">
          {Array.from({ length: 16 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="doc-line wide lower" />
        <div className="doc-line lower" />
        <span className="box title-box">title</span>
        <span className="box paragraph-box">paragraph</span>
        <span className="box table-box">table</span>
        <span className="box cell-box">cells</span>
        <span className="box keyvalue-box">key-value</span>
      </div>
      <div className="structured-output">
        <FileJson size={20} />
        <pre>{`{
  "document": "business_pdf",
  "tables": 3,
  "layout_accuracy": "${stage === "post" ? "92%" : stage === "model" ? "85%" : "65%"}"
}`}</pre>
      </div>
    </div>
  );
}

export default DocParsePage;
