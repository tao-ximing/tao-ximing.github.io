import { useId, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ShieldCheck,
} from "lucide-react";
import { handleTabListKeyDown, usePrefersReducedMotion } from "../a11y.js";
import MotionRoot from "../shared/MotionRoot.jsx";
import { STILL } from "../shared/motion.js";
import { assetBase } from "../shared/site.js";

const clinicScreens = [
  {
    id: "patients",
    label: "Patients",
    title: "Patient registry",
    image: `${assetBase}images/clinic-patients.jpg`,
    imageWebp: `${assetBase}images/clinic-patients.webp`,
    imageSize: [616, 1269],
    description:
      "A searchable patient queue gives clinicians a clear starting point before opening an assessment or report workflow.",
    points: ["Patient code search", "Status visibility", "Clinician-ready queue"],
  },
  {
    id: "assessments",
    label: "Assessments",
    title: "Assessment tracking",
    image: `${assetBase}images/clinic-assessments.jpg`,
    imageWebp: `${assetBase}images/clinic-assessments.webp`,
    imageSize: [616, 1232],
    description:
      "Active and historical assessments are organized by review state so clinicians can quickly find work in progress and approved sessions.",
    points: ["In-progress filtering", "Review readiness", "Historical context"],
  },
  {
    id: "reports",
    label: "Reports",
    title: "Report lifecycle",
    image: `${assetBase}images/clinic-reports.jpg`,
    imageWebp: `${assetBase}images/clinic-reports.webp`,
    imageSize: [616, 1221],
    description:
      "Reports move through draft, approval, sharing, and revoke states without hiding the clinician approval step.",
    points: ["Draft visibility", "Approval control", "Shared report tracking"],
  },
];

function ClinicFlow() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = clinicScreens[activeIndex];
  const reduce = usePrefersReducedMotion();
  const idPrefix = useId();
  const tabId = (screen) => `${idPrefix}-tab-${screen.id}`;
  const descriptionId = (screen) => `${idPrefix}-desc-${screen.id}`;

  return (
    <section className="clinic-page">
      <div className="clinic-head">
        <h1 tabIndex={-1}>Clinical Workflow App</h1>
        <p>
          A clinician-facing application for managing patients, tracking movement assessments,
          and controlling patient report status across a structured review workflow.
        </p>
      </div>

      <div className="clinic-showcase">
        <div className="clinic-copy">
          <h2>Clinical workflow, built as a real app.</h2>
          {/* All descriptions share one grid cell so the block keeps the height
              of the longest one and the tabs below never move. */}
          <div className="clinic-description">
            {clinicScreens.map((screen, index) => (
              <p
                className={index === activeIndex ? "active" : ""}
                id={descriptionId(screen)}
                key={screen.id}
              >
                {screen.description}
              </p>
            ))}
          </div>

          <div
            className="clinic-tabs"
            role="tablist"
            aria-label="Clinical app screens"
            onKeyDown={(event) => handleTabListKeyDown(event, setActiveIndex)}
          >
            {clinicScreens.map((screen, index) => (
              <button
                aria-selected={index === activeIndex}
                id={tabId(screen)}
                key={screen.id}
                onClick={() => setActiveIndex(index)}
                role="tab"
                tabIndex={index === activeIndex ? 0 : -1}
                type="button"
              >
                {screen.label}
              </button>
            ))}
          </div>
        </div>

        <div className="clinic-phone-stage">
          {clinicScreens.map((screen, index) => (
            <motion.figure
              animate={{
                opacity: index === activeIndex ? 1 : 0.28,
                x: index === activeIndex ? 0 : (index - activeIndex) * 42,
                y: index === activeIndex ? 0 : 24,
                rotate: index === activeIndex ? 0 : (index - activeIndex) * 5,
                scale: index === activeIndex ? 1 : 0.88,
                zIndex: index === activeIndex ? 3 : 1,
              }}
              className="clinic-phone"
              initial={false}
              key={screen.id}
              transition={
                reduce
                  ? { duration: 0.45, ease: [0.2, 0.8, 0.2, 1], rotate: STILL, scale: STILL }
                  : { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }
              }
            >
              <picture>
                <source srcSet={screen.imageWebp} type="image/webp" />
                <img
                  alt={`${screen.label} screen`}
                  decoding="async"
                  height={screen.imageSize[1]}
                  src={screen.image}
                  width={screen.imageSize[0]}
                />
              </picture>
            </motion.figure>
          ))}
        </div>

        <div className="clinic-panels">
          <div
            className="clinic-detail-card"
            role="tabpanel"
            aria-labelledby={tabId(active)}
            aria-describedby={descriptionId(active)}
            tabIndex={0}
          >
            <span>{active.title}</span>
            <ul>
              {active.points.map((point) => (
                <li key={point}>
                  <Check size={15} />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="clinic-control-card">
            <ShieldCheck size={20} />
            <div>
              <strong>Clinician remains in control</strong>
              <p>
                The system structures work and report states; clinical recommendations stay
                reviewable and approval-controlled.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="clinic-workflow">
        {[
          ["Patient", "Registry and search"],
          ["Assessment", "Status tracking"],
          ["Findings", "Structured clinical notes"],
          ["Review", "Clinician approval"],
          ["Report", "Share or revoke"],
        ].map(([title, body], index) => (
          <article key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{title}</strong>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function ClinicFlowPage() {
  return (
    <MotionRoot>
      <ClinicFlow />
    </MotionRoot>
  );
}
