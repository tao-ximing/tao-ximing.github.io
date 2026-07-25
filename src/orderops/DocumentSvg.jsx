import React, { useId } from "react";
import { motion } from "framer-motion";

export const DOC_W = 420;
export const DOC_H = 560;

const CONF_COLORS = { green: "#059669", amber: "#c26a22", red: "#c24135", muted: "#667085" };

export function confTone(confidence) {
  if (confidence == null) return "muted";
  if (confidence >= 0.95) return "green";
  if (confidence >= 0.8) return "amber";
  return "red";
}

export function confColor(confidence) {
  return CONF_COLORS[confTone(confidence)];
}

// Single source of truth: the same layout drives the rendered paper and the
// bbox overlay, so coordinates can never drift apart.
export function buildLayout(doc) {
  const boxes = {};

  if (doc.kind === "excel") {
    const startX = 16;
    const startY = 96;
    const w = DOC_W - 32;
    const headerH = 26;
    const rowH = 30;
    const widths = doc.widths || doc.columns.map(() => 1 / doc.columns.length);
    let x = startX;
    const cols = widths.map((fraction, i) => {
      const col = { x, w: fraction * w, label: doc.columns[i] };
      x += fraction * w;
      return col;
    });
    const rows = doc.rows.map((cells, ri) => ({
      y: startY + headerH + ri * rowH,
      cells: cells.map((text, ci) => ({ x: cols[ci].x, w: cols[ci].w, text })),
    }));
    const gridH = headerH + doc.rows.length * rowH;
    const colBoxes = cols.map((col) => ({ x: col.x, y: startY, w: col.w, h: gridH }));
    return { kind: "excel", startX, startY, w, headerH, rowH, cols, rows, gridH, colBoxes, boxes };
  }

  const metaStartY = 122;
  const metaStep = 26;
  const metaRows = (doc.meta || []).map((m, i) => {
    const y = metaStartY + i * metaStep;
    if (m.id) boxes[m.id] = { x: 146, y: y - 15, w: 246, h: 21 };
    return { ...m, y };
  });

  const afterMetaY = metaStartY + (doc.meta?.length || 0) * metaStep + 18;
  let table = null;
  if (doc.table) {
    const x = 30;
    const w = 360;
    const headerH = 24;
    const rowH = 28;
    let cx = x;
    const cols = doc.table.columns.map((c) => {
      const col = { x: cx, w: c.w * w, label: c.label };
      cx += c.w * w;
      return col;
    });
    const rows = doc.table.rows.map((cells, ri) => {
      const y = afterMetaY + headerH + ri * rowH;
      return {
        y,
        cells: cells.map((text, ci) => {
          const key = `${ri}-${ci}`;
          const id = doc.table.fieldCells?.[key];
          if (id) boxes[id] = { x: cols[ci].x + 2, y: y + 3, w: cols[ci].w - 4, h: rowH - 6 };
          return {
            x: cols[ci].x,
            w: cols[ci].w,
            text: doc.table.display?.[key] ?? text,
            smudge: doc.table.smudge?.includes(key),
          };
        }),
      };
    });
    table = { x, y: afterMetaY, w, headerH, rowH, cols, rows, endY: afterMetaY + headerH + rows.length * rowH };
  }

  const ghost = doc.ghostTable ? { x: 30, y: afterMetaY, w: 360, h: 118 } : null;
  const bodyLines = (doc.bodyLines || []).map((text, i) => ({ text, y: afterMetaY + 12 + i * 24 }));
  const sigY = Math.max(
    table ? table.endY + 58 : 0,
    ghost ? ghost.y + ghost.h + 58 : 0,
    bodyLines.length ? bodyLines[bodyLines.length - 1].y + 70 : 0,
    440
  );

  return { kind: "pdf", metaRows, table, ghost, bodyLines, sigY, boxes };
}

function PdfContents({ doc, layout, smudgeFilter }) {
  return (
    <>
      <rect x="26" y="26" width="42" height="42" rx="12" fill={doc.accent} opacity="0.88" />
      <circle cx="47" cy="47" r="9" fill="rgba(255,255,255,0.85)" />
      <text x="80" y="46" fontSize="15" fontWeight="740" fill="#0d1326">
        {doc.company}
      </text>
      <text x="80" y="63" fontSize="9.5" fill="#667085">
        {doc.tagline}
      </text>
      <text x="392" y="46" fontSize="10" fontWeight="740" letterSpacing="1.5" textAnchor="end" fill="#667085">
        {doc.docTitle}
      </text>
      <line x1="26" y1="90" x2="394" y2="90" stroke="rgba(15,23,42,0.12)" />

      {layout.metaRows.map((m) => (
        <g key={m.label}>
          <text x="30" y={m.y} fontSize="8.5" letterSpacing="1" fill="#98a2b3">
            {m.label.toUpperCase()}
          </text>
          <text
            x="150"
            y={m.y}
            fontSize="11"
            fontWeight="620"
            fill="#1f2937"
            filter={m.smudge ? smudgeFilter : undefined}
            opacity={m.smudge ? 0.8 : 1}
          >
            {m.display ?? m.value}
          </text>
        </g>
      ))}

      {layout.bodyLines.map((line) => (
        <text key={line.text} x="30" y={line.y} fontSize="11.5" fill="#344054">
          {line.text}
        </text>
      ))}

      {layout.table && (
        <g>
          <rect
            x={layout.table.x}
            y={layout.table.y}
            width={layout.table.w}
            height={layout.table.headerH}
            fill="rgba(15,23,42,0.045)"
            rx="4"
          />
          {layout.table.cols.map((col) => (
            <text key={col.label} x={col.x + 8} y={layout.table.y + 16} fontSize="8.5" letterSpacing="0.8" fill="#667085">
              {col.label.toUpperCase()}
            </text>
          ))}
          {layout.table.rows.map((row, ri) => (
            <g key={ri}>
              <line
                x1={layout.table.x}
                y1={row.y + layout.table.rowH}
                x2={layout.table.x + layout.table.w}
                y2={row.y + layout.table.rowH}
                stroke="rgba(15,23,42,0.07)"
              />
              {row.cells.map((cell, ci) => (
                <text
                  key={ci}
                  x={cell.x + 8}
                  y={row.y + 19}
                  fontSize="10.5"
                  fill="#1f2937"
                  filter={cell.smudge ? smudgeFilter : undefined}
                  opacity={cell.smudge ? 0.78 : 1}
                >
                  {cell.text}
                </text>
              ))}
            </g>
          ))}
        </g>
      )}

      {layout.ghost && (
        <g>
          <rect
            x={layout.ghost.x}
            y={layout.ghost.y}
            width={layout.ghost.w}
            height={layout.ghost.h}
            rx="6"
            fill="none"
            stroke="rgba(15,23,42,0.16)"
            strokeDasharray="5 5"
          />
          <g transform={`rotate(-2 ${layout.ghost.x + 180} ${layout.ghost.y + 60})`} opacity="0.28">
            {[0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1={layout.ghost.x + 14}
                y1={layout.ghost.y + 26 + i * 24}
                x2={layout.ghost.x + layout.ghost.w - 18}
                y2={layout.ghost.y + 22 + i * 24}
                stroke="#667085"
                strokeWidth="7"
                strokeLinecap="round"
              />
            ))}
          </g>
          <text
            x={layout.ghost.x + layout.ghost.w / 2}
            y={layout.ghost.y + layout.ghost.h / 2 + 4}
            fontSize="10"
            textAnchor="middle"
            fill="#98a2b3"
          >
            faint, skewed line-item table
          </text>
        </g>
      )}

      {doc.signature && (
        <g>
          <path
            d={`M 34 ${layout.sigY} q 12 -20 26 -4 t 26 -2 q 10 6 26 -6`}
            fill="none"
            stroke="#344054"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line x1="30" y1={layout.sigY + 12} x2="150" y2={layout.sigY + 12} stroke="rgba(15,23,42,0.2)" />
          <text x="30" y={layout.sigY + 26} fontSize="8.5" letterSpacing="1" fill="#98a2b3">
            AUTHORISED BY
          </text>
        </g>
      )}
    </>
  );
}

function ExcelContents({ doc, layout }) {
  const letters = ["A", "B", "C", "D", "E", "F"];
  return (
    <>
      <rect x="1" y="1" width={DOC_W - 2} height="34" rx="14" fill="rgba(15,23,42,0.05)" />
      <rect x="1" y="20" width={DOC_W - 2} height="16" fill="rgba(15,23,42,0.05)" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={20 + i * 14} cy="18" r="4" fill="rgba(15,23,42,0.16)" />
      ))}
      <text x="66" y="22" fontSize="10.5" fontWeight="640" fill="#344054">
        {doc.filename}
      </text>
      {layout.cols.map((col, i) => (
        <text key={i} x={col.x + col.w / 2} y={layout.startY - 10} fontSize="8.5" textAnchor="middle" fill="#98a2b3">
          {letters[i]}
        </text>
      ))}
      <rect
        x={layout.startX}
        y={layout.startY}
        width={layout.w}
        height={layout.headerH}
        fill="rgba(66,88,255,0.07)"
      />
      {layout.cols.map((col, i) => (
        <text key={i} x={col.x + 7} y={layout.startY + 17} fontSize="9" fontWeight="700" fill="#344054">
          {col.label}
        </text>
      ))}
      {layout.rows.map((row, ri) => (
        <g key={ri}>
          {row.cells.map((cell, ci) => (
            <text key={ci} x={cell.x + 7} y={row.y + 19} fontSize="10.5" fill="#1f2937">
              {cell.text}
            </text>
          ))}
        </g>
      ))}
      <g stroke="rgba(15,23,42,0.1)">
        {layout.rows.concat([{ y: layout.startY + layout.gridH - layout.rowH }]).map((row, i) => (
          <line
            key={i}
            x1={layout.startX}
            y1={row.y + layout.rowH}
            x2={layout.startX + layout.w}
            y2={row.y + layout.rowH}
          />
        ))}
        <line x1={layout.startX} y1={layout.startY} x2={layout.startX + layout.w} y2={layout.startY} />
        {layout.cols.map((col, i) => (
          <line key={i} x1={col.x} y1={layout.startY} x2={col.x} y2={layout.startY + layout.gridH} />
        ))}
        <line
          x1={layout.startX + layout.w}
          y1={layout.startY}
          x2={layout.startX + layout.w}
          y2={layout.startY + layout.gridH}
        />
      </g>
    </>
  );
}

export function DocumentSvg({
  doc,
  mini = false,
  scanning = false,
  boxesVisible = false,
  fields = [],
  fieldStatus = {},
  verifyReady = false,
  hoveredId = null,
  onHoverField,
  onVerifyField,
  reduce = false,
}) {
  const uid = useId().replace(/:/g, "");
  const smudgeFilter = `url(#smudge-${uid})`;
  const layout = buildLayout(doc);
  const boxedFields = fields.filter((f) => !f.noBox && layout.boxes[f.id]);

  return (
    <svg
      className={`doc-svg ${mini ? "doc-svg-mini" : ""}`}
      viewBox={`0 0 ${DOC_W} ${DOC_H}`}
      role="img"
      aria-label={doc.kind === "excel" ? `Spreadsheet ${doc.filename}` : `${doc.docTitle} from ${doc.company}`}
    >
      <defs>
        <filter id={`smudge-${uid}`} x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="0.55" />
        </filter>
        <linearGradient id={`scan-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(66,88,255,0)" />
          <stop offset="1" stopColor="rgba(66,88,255,0.22)" />
        </linearGradient>
      </defs>

      <rect x="1" y="1" width={DOC_W - 2} height={DOC_H - 2} rx="14" fill="#ffffff" stroke="rgba(15,23,42,0.12)" />

      {doc.kind === "excel" ? (
        <ExcelContents doc={doc} layout={layout} />
      ) : (
        <PdfContents doc={doc} layout={layout} smudgeFilter={smudgeFilter} />
      )}

      {boxesVisible &&
        boxedFields.map((field, i) => {
          const box = layout.boxes[field.id];
          const status = fieldStatus[field.id];
          const conf = status === "done" && field.verify ? field.verify.response.confidence : field.confidence;
          const failed = status === "done" && field.verify?.failed;
          const color = failed ? CONF_COLORS.red : confColor(conf);
          const needsVerify = Boolean(field.verify) && status !== "done";
          const active = hoveredId === field.id;
          return (
            <g key={field.id}>
              <motion.rect
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduce ? 0 : i * 0.08, duration: 0.3 }}
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                rx="4"
                fill={color}
                fillOpacity={active ? 0.16 : 0.06}
                stroke={color}
                strokeWidth={active ? 2.4 : 1.5}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => onHoverField?.(field.id)}
                onMouseLeave={() => onHoverField?.(null)}
                onClick={() => onHoverField?.(active ? null : field.id)}
                role="img"
                aria-label={`${field.id}: confidence ${field.confidence ?? "n/a"}`}
              />
              {needsVerify && verifyReady && (
                <g
                  className={status === "running" ? "" : "bbox-verify-pulse"}
                  style={{ cursor: "pointer" }}
                  onClick={() => onVerifyField?.(field.id)}
                  role="button"
                  aria-label={`Verify ${field.id} with LLM`}
                >
                  <circle cx={box.x + box.w} cy={box.y} r="9.5" fill="#695cff" />
                  <text x={box.x + box.w} y={box.y + 3.5} fontSize="10" textAnchor="middle" fill="#ffffff">
                    ✦
                  </text>
                </g>
              )}
            </g>
          );
        })}

      {scanning && !reduce && (
        <motion.g initial={{ y: -60 }} animate={{ y: DOC_H + 20 }} transition={{ duration: 0.9, ease: "linear" }}>
          <rect x="4" y="-44" width={DOC_W - 8} height="44" fill={`url(#scan-${uid})`} />
          <line x1="4" y1="0" x2={DOC_W - 4} y2="0" stroke="#4258ff" strokeWidth="2" opacity="0.75" />
        </motion.g>
      )}
    </svg>
  );
}

export function DocCrop({ doc, fieldId, width = 230 }) {
  const uid = useId().replace(/:/g, "");
  const layout = buildLayout(doc);
  const box = layout.boxes[fieldId];
  if (!box) return null;
  const pad = 14;
  return (
    <svg
      className="doc-crop"
      viewBox={`${box.x - pad} ${box.y - pad} ${box.w + pad * 2} ${box.h + pad * 2}`}
      width={width}
      role="img"
      aria-label={`Cropped document region for ${fieldId}`}
    >
      <defs>
        <filter id={`smudge-${uid}`} x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="0.55" />
        </filter>
      </defs>
      <rect x="1" y="1" width={DOC_W - 2} height={DOC_H - 2} rx="14" fill="#ffffff" />
      {doc.kind === "excel" ? (
        <ExcelContents doc={doc} layout={layout} />
      ) : (
        <PdfContents doc={doc} layout={layout} smudgeFilter={`url(#smudge-${uid})`} />
      )}
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx="4"
        fill="none"
        stroke="#695cff"
        strokeWidth="1.6"
        strokeDasharray="4 3"
      />
    </svg>
  );
}
