/**
 * Static data for the OrderOps sandbox: stage geometry, token icons and the
 * four fictional orders. Every coordinate lives in the fixed 1200×560 stage.
 */

export const STAGE = { width: 1200, height: 560 };

/** Wire paths between node ports, in stage coordinates. */
export const WIRES = {
  in: "M256 290 L300 290",
  pdf: "M468 290 C497 290 497 135 526 135",
  excel: "M468 290 C497 290 497 445 526 445",
  pdfGate: "M726 135 C761 135 761 290 796 290",
  excelGate: "M726 445 C761 445 761 290 796 290",
  pass: "M966 290 C994 290 994 135 1022 135",
  fail: "M966 290 C994 290 994 445 1022 445",
  unknown: "M726 500 L1022 500",
};

/** Trails that light up as a run passes; `entry` starts at the clicked inbox row. */
export const TRAIL_KEYS = [...Object.keys(WIRES), "entry"];

/**
 * Curve from an inbox row at stage height `y` into the classifier port.
 * @param {number} y
 * @returns {string}
 */
export function entryPath(y) {
  return `M236 ${y} C272 ${y} 264 290 300 290`;
}

export const ICONS = {
  pdf: "M4 1.5h5.5L13 5v9.5H4z M9.5 1.5V5H13",
  excel: "M2.5 2.5h11v11h-11z M2.5 6.5h11 M2.5 10h11 M6.5 6.5v7",
  json: "M6 2.5C4 2.5 4.5 5 4 6.5c-.3 1-1.5 1.5-1.5 1.5s1.2.5 1.5 1.5c.5 1.5 0 4 2 4 M10 2.5c2 0 1.5 2.5 2 4 .3 1 1.5 1.5 1.5 1.5s-1.2.5-1.5 1.5c-.5 1.5 0 4-2 4",
  csv: "M3 8.5l3 3 7-7",
  ticket: "M3.5 14.5V2 M3.5 2.5h9l-2 3 2 3h-9",
};

/** Processing nodes in render order, with their stage box. */
export const NODES = [
  { key: "classify", kind: "LLM", title: "Classify", sub: "format only", box: { left: 300, top: 225, width: 168, height: 130 } },
  { key: "pdf", kind: "OCR + LLM verify", title: "PDF lane", sub: "read · verify low confidence · match", box: { left: 526, top: 60, width: 200, height: 150 } },
  { key: "excel", kind: "Office Script", title: "Excel lane", sub: "detect template · parse", box: { left: 526, top: 370, width: 200, height: 150 } },
  { key: "gate", kind: "Rules", title: "Validation gate", sub: "LLMs propose, rules dispose", box: { left: 796, top: 200, width: 170, height: 180 } },
  { key: "sftp", kind: "Handoff", title: "SFTP → AX", sub: "orders created", box: { left: 1022, top: 60, width: 164, height: 150 } },
  { key: "human", kind: "Human", title: "Review queue", sub: "support users", box: { left: 1022, top: 370, width: 164, height: 150 } },
];

export const INBOX_BOX = { left: 16, top: 105, width: 240, height: 370 };

export const NODE_NAMES = {
  inbox: "Inbox",
  classify: "Classify",
  pdf: "PDF lane",
  excel: "Excel lane",
  gate: "Validation gate",
  sftp: "SFTP → AX",
  human: "Review queue",
};

/**
 * @typedef {"ok" | "bad" | "warn" | "info"} Tone
 * @typedef {[string, Tone]} Line
 * @typedef {{
 *   id: string, customer: string, file: string, kind: "pdf" | "excel", meta: string,
 *   classify: Line[], lane: Line[], payload?: string, rules?: [string, boolean][],
 *   outcome: "sftp" | "human" | "unknown", end: Line[], result: [string, Tone],
 *   log: { arrive: string, classify: string, lane: string, gate?: string, end: string },
 * }} SandboxCase
 */

/** @type {SandboxCase[]} */
export const CASES = [
  {
    id: "harbourline",
    customer: "Harbourline Living",
    file: "PO-88231.pdf",
    kind: "pdf",
    meta: "3 lines · Riverstone",
    classify: [["purchase_order", "info"], ["0.96 → PDF lane", "ok"]],
    lane: [["OCR · 7 fields", "info"], ["Verify · “1O” → 10", "warn"], ["Match · 19,000 → 1", "ok"]],
    payload: "JSON · 3 lines",
    rules: [["Customer ↔ account", true], ["Item codes 3/3", true], ["Price ≤ 2% off list", true], ["Pack multiples", true]],
    outcome: "sftp",
    end: [["CSV · 3 lines", "ok"], ["Polled into AX", "ok"]],
    result: ["Sent to AX", "ok"],
    log: {
      arrive: "PO-88231.pdf arrives from Harbourline Living.",
      classify: "Purchase order, 0.96 confidence. The LLM picks the lane; it never extracts order data.",
      lane: "OCR reads 7 fields. Only one crop, a quantity read as “1O” at 0.71, goes to the LLM, which reads 10. Fuzzy matching narrows 19,000 accounts to AC-20431.",
      gate: "All 4 rule groups pass.",
      end: "The CSV goes to SFTP and is polled into Dynamics AX. Nobody touched this order.",
    },
  },
  {
    id: "gather",
    customer: "Gather Home Co.",
    file: "PO_GH-JUL-19.pdf",
    kind: "pdf",
    meta: "3 lines · Kingsford",
    classify: [["purchase_order", "info"], ["0.96 → PDF lane", "ok"]],
    lane: [["OCR · 7 fields", "info"], ["Verify · not needed", "info"], ["Match · 19,000 → 1", "ok"]],
    payload: "JSON · 3 lines",
    rules: [["Customer ↔ account", true], ["Item codes 0/3", false], ["Prices present", true], ["Line count 3", true]],
    outcome: "human",
    end: [["Ticket · 3 codes", "bad"], ["Reply drafted", "info"]],
    result: ["In review", "bad"],
    log: {
      arrive: "PO_GH-JUL-19.pdf arrives from Gather Home Co.",
      classify: "Purchase order, 0.96 confidence, so it goes to the PDF lane.",
      lane: "OCR reads every field at 0.96 or higher, so no crop needs the LLM. Fuzzy matching finds AC-14220.",
      gate: "Item codes fail. PLU-4471 to PLU-4473 are the customer's own codes, so the order stops here instead of being created wrong.",
      end: "A support user gets one ticket with the three codes and a drafted reply to the customer.",
    },
  },
  {
    id: "northgate",
    customer: "Northgate Trading",
    file: "northgate_po_0731.xlsx",
    kind: "excel",
    meta: "2 lines",
    classify: [["purchase_order", "info"], ["0.96 → Excel lane", "ok"]],
    lane: [["Detect · sender hit", "ok"], ["Template #3 · AC-17708", "ok"], ["Parse · 2 lines", "info"]],
    payload: "JSON · 2 lines",
    rules: [["Account pinned", true], ["Address exact", true], ["Item codes 2/2", true], ["Prices · 2 issues", false]],
    outcome: "human",
    end: [["Ticket · 2 prices", "bad"], ["Reply drafted", "info"]],
    result: ["In review", "bad"],
    log: {
      arrive: "northgate_po_0731.xlsx arrives from Northgate Trading.",
      classify: "Purchase order, 0.96 confidence, so it goes to the Excel lane.",
      lane: "Detect is an Office Script, not a model. The sender hits Template #3, which pins account AC-17708. The parse script reads 2 lines, with no confidence scores to second-guess.",
      gate: "Line 1 is 34% over the price list and line 2 has no price.",
      end: "One ticket lists both price issues, with a drafted reply asking the customer to confirm.",
    },
  },
  {
    id: "maple",
    customer: "Maple & March",
    file: "mm_order_form_v2.xlsx",
    kind: "excel",
    meta: "new sender",
    classify: [["purchase_order", "info"], ["0.94 → Excel lane", "ok"]],
    lane: [["Sender · no match", "bad"], ["Structure · 0 of 8", "bad"], ["Unknown · not guessed", "bad"]],
    outcome: "unknown",
    end: [["Manual entry", "bad"], ["→ unknown pool", "info"]],
    result: ["Manual entry", "bad"],
    log: {
      arrive: "mm_order_form_v2.xlsx arrives from Maple & March Trading.",
      classify: "Purchase order, 0.94 confidence, so it goes to the Excel lane.",
      lane: "The sender is none of the 16 known addresses and the sheet matches none of the 8 template structures. Nothing guesses.",
      end: "Queued for manual entry. The format joins the unknown pool, and enough volume earns it a ninth template script.",
    },
  },
];
