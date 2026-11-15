import {
  ArrowDownToLine,
} from "lucide-react";
import { assetBase, email } from "../shared/site.js";

const resume = {
  summary:
    "Production-focused AI Engineer with 5 years of experience designing and shipping applied AI systems across agentic workflow automation, retrieval, document intelligence, structured extraction, and LLM evaluation. Experienced in running discovery with non-technical stakeholders, reframing ambiguous business processes into well-scoped problems, and building reliable systems that combine AI capabilities with deterministic validation and human review.",
  experience: [
    {
      role: "AI Automation Consultant (project-based re-engagement)",
      org: "Xperience, Melbourne",
      time: "Jun 2026 - Present",
      bullets: [
        "Supporting, hardening, and extending the production sales order automation platform, maintaining version-tracked prompt histories and failure-case analysis across releases.",
      ],
    },
    {
      role: "AI Automation Engineer",
      org: "Xperience, Melbourne",
      time: "Oct 2025 - May 2026",
      bullets: [
        "Architected and delivered a production sales-order automation platform for a national wholesale distributor using C#/.NET, Power Automate, Azure Container Apps, Service Bus, PostgreSQL, SharePoint, and SFTP integrations, automating around 70% of eligible orders and saving approximately two hours per Sales Support user per day.",
        "Ran discovery directly with non-technical operations and technology stakeholders to reframe ambiguous order handling processes into well-scoped automation problems and deliver the platform through UAT and production rollout.",
        "Designed a hybrid AI-deterministic architecture: an isolated LLM service handled order classification, ambiguous Excel cases, master-data candidate ranking, exception summaries, and clarification drafts, while validation, approvals, Zendesk routing, CSV generation, and SFTP delivery remained deterministic against versioned PostgreSQL master data.",
        "Built backend services and deterministic worker pipelines for Microsoft Graph email ingestion, PDF extraction with Azure Document Intelligence, parsing across eight Excel templates, order JSON normalisation, and CSV export for Dynamics AX.",
      ],
    },
    {
      role: "Independent AI Engineer",
      org: "Freelance",
      time: "Mar 2025 - Sep 2025",
      bullets: [
        "Extended a startup client's SaaS MVP with finance-domain RAG, confidence-based model escalation, and structured document extraction; a locally hosted small-model classifier routed queries across dedicated analysis paths, reducing AI processing cost by over 80%.",
        "Built an evaluation system to tune the pipeline empirically, comparing classifier model selection, prompt versions, chunking strategies, and reranker settings against answer quality, cost, and failure-case metrics.",
        "Built and deployed a self-hosted automation assistant (n8n, PostgreSQL) for a practising doctor, integrating calendar, messaging, and LLM-based analysis of consultation recordings; reduced missed patient responses from 5-8 per day to under 2, with the workflow in continuous daily use.",
      ],
    },
    {
      role: "Machine Learning Engineer",
      org: "Virtual Mike, Australia",
      time: "Apr 2024 - Mar 2025",
      bullets: [
        "Built a controlled legal Q&A system grounded in approved, versioned PostgreSQL answer records.",
        "Implemented legal topic, intent, jurisdiction, confidence, retrieval, evaluation, and human fallback flows.",
        "Reduced repetitive legal review effort by approximately 70%.",
      ],
    },
    {
      role: "Machine Learning Engineer",
      org: "Auxilis, Australia",
      time: "Apr 2022 - Feb 2024",
      bullets: [
        "Developed PaddleOCR-based document intelligence systems for layout analysis across tables, paragraphs, and titles.",
        "Built a 15,000-sample training dataset using AWS Textract and Label Studio.",
        "Improved layout parsing accuracy from a 65% baseline to 85% after fine-tuning and 92% after post-processing, while reducing cloud API reliance by 60%.",
      ],
    },
    {
      role: "Machine Learning Engineer",
      org: "Wuhan Purvar Bigdata Technology Co., Ltd.",
      time: "Jun 2020 - Sep 2021",
      bullets: [
        "Worked on automated English essay scoring with BERT-based Transformer representations and scoring consistency experiments.",
      ],
    },
  ],
  skills: [
    "Python",
    "C#",
    "TypeScript",
    "SQL",
    "RAG",
    "LLM Evaluation",
    "Agent Orchestration",
    "MCP",
    "LangChain",
    "LangSmith",
    "ChromaDB",
    "FastAPI",
    "Django",
    ".NET",
    "React",
    "Next.js",
    "PostgreSQL",
    "OCR",
    "PaddleOCR",
    "OpenCV",
    "Azure AI Document Intelligence",
    "AWS Textract",
    "Azure OpenAI",
    "Azure Container Apps",
    "Azure Service Bus",
    "AWS Bedrock",
    "Docker",
    "Power Automate",
    "n8n",
  ],
};

function ResumePage() {
  return (
    <section className="resume-page">
      <div className="resume-hero">
        <div>
          <h1 tabIndex={-1}>Ximing Tao</h1>
          <p>{resume.summary}</p>
        </div>
        <div className="resume-actions">
          <a href={`mailto:${email}`}>{email}</a>
          <a href={`${assetBase}XimingTao_resume.pdf`} download="XimingTao_resume.pdf">
            <ArrowDownToLine size={16} />
            Download PDF
          </a>
        </div>
      </div>

      <div className="resume-layout">
        <aside>
          <h2>Skills</h2>
          <div className="resume-skills">
            {resume.skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </aside>
        <div className="experience-list">
          <h2>Experience</h2>
          {resume.experience.map((item) => (
            <article key={`${item.role}-${item.org}`}>
              <div>
                <h3>{item.role}</h3>
                <span>{item.org} / {item.time}</span>
              </div>
              <ul>
                {item.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ResumePage;
