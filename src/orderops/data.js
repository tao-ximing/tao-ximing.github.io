// Pipeline Inspector mock data.
// Every customer, account ID, address, item code, and price in this file is
// fictional. Error patterns mirror anonymised UAT findings; entities do not.

const rule = (id, label, status, detail) => ({ id, label, status, detail });

const RULE_LABELS = {
  customer_cross: "Customer name ↔ account ID cross-check",
  item_master: "Item codes exist in product master",
  price_present: "Unit price present on every line",
  price_tolerance: "Price within tolerance of customer price list",
  discount_range: "Discount within allowed range",
  line_count: "Line item count > 0",
  moq: "Quantity meets MOQ / pack multiple",
  sales_origin: "Sales origin = email",
  address_exact: "Delivery address matches account record exactly",
};

const r = (id, status, detail) => rule(id, RULE_LABELS[id], status, detail);

export const CAPTIONS = {
  classify:
    "A missed order stays in the inbox (visible). A false positive hits the validation wall. The classifier is allowed to be wrong. From here, orders split into two lanes: PDFs to OCR, Excel to template detect.",
  extractPdf:
    "Azure Document Intelligence returns fields, bounding boxes, and confidence. Low confidence is a routing signal, not an error.",
  detect:
    "An Office Script, not an LLM: sender first — eight template customers, sixteen fixed sender addresses — then structure. A hit pins template and customer account together, one-to-one. Nine outputs: eight templates plus unknown, and unknown is never guessed.",
  extractScript:
    "Eight templates cover ~80% of Excel volume — each with its own parse script. No confidence scores in this lane: a cell is what it is, and values go straight to exact checks against master data.",
  verify: "LLM cost is spent only where OCR is uncertain.",
  match:
    "Pre-filter 19,000 master rows down to a shortlist; the LLM only ever chooses among vetted candidates.",
  validate:
    "LLMs propose. Rules dispose. The gate collects every failure — humans shouldn't discover problems one at a time.",
  outcomeOk:
    "Clean CSV → SFTP → Dynamics AX, which keeps its own downstream review gate.",
  outcomeBlocked: "One ticket, every error.",
};

export const INSPECTOR_CASES = [
  {
    id: "clean-pdf",
    chipLabel: "Clean PDF order",
    customer: "Harbourline Living — Riverstone",
    docType: "PDF",
    badge: { tone: "green", label: "Automated" },
    blurb: "One smudged quantity, verified by the LLM, then straight through.",
    document: {
      kind: "pdf",
      docTitle: "PURCHASE ORDER",
      company: "Harbourline Living",
      tagline: "Homewares & Living",
      accent: "#695cff",
      meta: [
        { id: "po_number", label: "PO number", value: "PO-88231" },
        { id: "order_date", label: "Order date", value: "14 Jul 2026" },
        { id: "store_name", label: "Store", value: "Harbourline Living — Riverstone" },
        { id: "delivery_address", label: "Deliver to", value: "Unit 4, 18 Mill Lane, Riverstone NSW 2841" },
      ],
      table: {
        columns: [
          { label: "Item code", w: 0.24 },
          { label: "Description", w: 0.42 },
          { label: "Qty", w: 0.12 },
          { label: "Unit $", w: 0.22 },
        ],
        rows: [
          ["HL-2210", "Woven throw — sage", "6", "24.50"],
          ["HL-1180", "Stoneware vase 20cm", "10", "18.90"],
          ["HL-3305", "Oak photo frame A4", "12", "9.75"],
        ],
        fieldCells: { "0-2": "qty_line_1", "1-2": "qty_line_2", "2-2": "qty_line_3" },
        display: { "1-2": "1O" },
        smudge: ["1-2"],
      },
      signature: true,
    },
    stages: [
      {
        key: "classify",
        title: "Email Classification",
        caption: CAPTIONS.classify,
        artifact: {
          documentType: "purchase_order",
          confidence: 0.98,
          reasoning:
            "Subject and attachment contain a PO number and priced line items; sender domain is a known trading partner.",
        },
      },
      {
        key: "extract",
        title: "Extraction — OCR (PDF lane)",
        short: "Extract",
        caption: CAPTIONS.extractPdf,
        lane: "pdf",
        fields: [
          { id: "po_number", value: "PO-88231", confidence: 0.99 },
          { id: "order_date", value: "14 Jul 2026", confidence: 0.98 },
          { id: "store_name", value: "Harbourline Living — Riverstone", confidence: 0.96 },
          { id: "delivery_address", value: "Unit 4, 18 Mill Lane, Riverstone NSW 2841", confidence: 0.97 },
          { id: "qty_line_1", value: "6", confidence: 0.98 },
          {
            id: "qty_line_2",
            value: "1O",
            confidence: 0.71,
            verify: {
              prompt: 'Verify the value in this crop. OCR read "1O" at 0.71.',
              response: { verifiedValue: "10", confidence: 0.97, agreesWithOcr: false },
              note: "OCR read the digit zero as the letter O. Corrected.",
            },
          },
          { id: "qty_line_3", value: "12", confidence: 0.96 },
        ],
      },
      { key: "verify", title: "LLM Verification", caption: CAPTIONS.verify },
      {
        key: "match",
        title: "Customer Matching",
        caption: CAPTIONS.match,
        prefilter: {
          filters: { suburb: "Riverstone", postcode: "2841", storeNameTokens: ["harbourline"] },
          from: 19000,
          to: 2,
        },
        shortlist: [
          {
            accountId: "AC-20431",
            name: "Harbourline Living — Riverstone",
            address: "Unit 4, 18 Mill Lane, Riverstone",
            score: 0.96,
            pick: true,
            correct: true,
          },
          {
            accountId: "AC-20112",
            name: "Harbourline Living — Westhaven",
            address: "2 Garden Tce, Westhaven",
            score: 0.61,
          },
        ],
      },
      {
        key: "validate",
        title: "Validation Gate",
        caption: CAPTIONS.validate,
        rules: [
          r("customer_cross", "pass", "Harbourline Living ↔ AC-20431"),
          r("item_master", "pass", "3 of 3 item codes found"),
          r("price_present", "pass", "All lines priced"),
          r("price_tolerance", "pass", "Max deviation 2% vs price list"),
          r("line_count", "pass", "3 lines"),
          r("moq", "pass", "All quantities meet pack multiples"),
          r("sales_origin", "pass", 'Set to "email"'),
        ],
      },
      {
        key: "outcome",
        title: "Outcome",
        caption: CAPTIONS.outcomeOk,
        kind: "csv",
        csv: {
          columns: ["account_id", "po_number", "item_code", "qty", "unit_price", "origin"],
          rows: [
            ["AC-20431", "PO-88231", "HL-2210", "6", "24.50", "email"],
            ["AC-20431", "PO-88231", "HL-1180", "10", "18.90", "email"],
            ["AC-20431", "PO-88231", "HL-3305", "12", "9.75", "email"],
          ],
          note: "Uploaded to SFTP → polled into Dynamics AX. Note qty 10 on line 2 — the verified value, not the OCR read.",
        },
      },
    ],
  },

  {
    id: "silent-mismatch",
    chipLabel: "Silent mismatch",
    customer: "Fern & Oak Homewares — Marlow Park",
    docType: "PDF",
    badge: { tone: "violet", label: "Silent Error — Before/After" },
    blurb: "The centerpiece: a wrong match every action reported as Succeeded.",
    toggleCaption:
      "A loud failure is an inconvenience; a silent failure is a threat. The fix wasn't prompt-tuning — it was structure.",
    document: {
      kind: "pdf",
      docTitle: "PURCHASE ORDER",
      company: "Fern & Oak Homewares",
      tagline: "Considered objects for the home",
      accent: "#0f766e",
      meta: [
        { id: "po_number", label: "PO number", value: "PO-55102" },
        { id: "order_date", label: "Order date", value: "02 Jul 2026" },
        {
          id: "store_name",
          label: "Store",
          value: "Fern & Oak Homewares — Marlow Park",
          display: "Fern & 0ak Homew∗res — Marlow Park",
          smudge: true,
        },
        { id: "delivery_address", label: "Deliver to", value: "31 Garland Rd, Marlow Park VIC 3299" },
      ],
      table: {
        columns: [
          { label: "Item code", w: 0.24 },
          { label: "Description", w: 0.42 },
          { label: "Qty", w: 0.12 },
          { label: "Unit $", w: 0.22 },
        ],
        rows: [
          ["FO-8834", "Linen cushion set", "8", "22.00"],
          ["FO-2210", "Ceramic planter duo", "4", "31.50"],
        ],
        fieldCells: { "0-2": "qty_line_1", "1-2": "qty_line_2" },
      },
      signature: true,
    },
    variants: {
      before: {
        label: "Before fix",
        stages: [
          {
            key: "classify",
            title: "Email Classification",
            caption: CAPTIONS.classify,
            artifact: {
              documentType: "purchase_order",
              confidence: 0.97,
              reasoning: "PO number, priced line items, known sender domain.",
            },
          },
          {
            key: "extract",
            title: "Extraction — OCR (PDF lane)",
        short: "Extract",
            caption: CAPTIONS.extractPdf,
            lane: "pdf",
            fields: [
              { id: "po_number", value: "PO-55102", confidence: 0.98 },
              { id: "order_date", value: "02 Jul 2026", confidence: 0.97 },
              {
                id: "store_name",
                value: "Fern & 0ak Homew∗res — Marlow Park",
                confidence: 0.83,
                verify: {
                  prompt: 'Verify the value in this crop. OCR read "Fern & 0ak Homew∗res" at 0.83.',
                  response: {
                    verifiedValue: "Fern & Oak Homewares — Marlow Park",
                    confidence: 0.94,
                    agreesWithOcr: false,
                  },
                  note: "Print noise on the store name. Corrected — but 0.94 is still below certainty.",
                },
              },
              { id: "delivery_address", value: "31 Garland Rd, Marlow Park VIC 3299", confidence: 0.96 },
              { id: "qty_line_1", value: "8", confidence: 0.98 },
              { id: "qty_line_2", value: "4", confidence: 0.97 },
            ],
          },
          { key: "verify", title: "LLM Verification", caption: CAPTIONS.verify },
          {
            key: "match",
            title: "Customer Matching",
            caption: "v1: fuzzy score decides. Nothing checks the winner afterwards.",
            prefilter: {
              filters: { suburb: "Marlow Park", postcode: "3299", storeNameTokens: ["fern", "homewares"] },
              from: 19000,
              to: 4,
            },
            shortlist: [
              {
                accountId: "AC-11902",
                name: "Fernwood Furniture — Marlow Park",
                address: "5 Garland Rd, Marlow Park",
                score: 0.87,
                pick: true,
                wrong: true,
              },
              {
                accountId: "AC-10287",
                name: "Fern & Oak Homewares — Marlow Park",
                address: "31 Garland Rd, Marlow Park",
                score: 0.84,
                correct: true,
              },
              { accountId: "AC-11433", name: "Fern Lane Living — Kingsford", address: "9 Weaver St, Kingsford", score: 0.52 },
              { accountId: "AC-09918", name: "Oakhaven Trading — Marlow Park", address: "12 Foundry Rd, Marlow Park", score: 0.49 },
            ],
            note:
              "Two similar names share the suburb. The noisy OCR name scored the wrong one higher — and the highest score wins.",
          },
          {
            key: "validate",
            title: "Validation Gate",
            caption: "v1 gate: everything passes — because the one rule that would catch this doesn't exist yet.",
            rules: [
              r("customer_cross", "absent", "No cross-check in v1 — this row did not exist"),
              r("item_master", "pass", "2 of 2 item codes found"),
              r("price_present", "pass", "All lines priced"),
              r("price_tolerance", "pass", "Checked against AC-11902's price list — the wrong list, still within tolerance"),
              r("line_count", "pass", "2 lines"),
              r("sales_origin", "pass", 'Set to "email"'),
            ],
          },
          {
            key: "outcome",
            title: "Outcome",
            caption: "Every action reported Succeeded. Nothing in the run log was red.",
            kind: "csv-error",
            csv: {
              banner: "SILENT ERROR — order created against the wrong account",
              columns: ["account_id", "po_number", "item_code", "qty", "unit_price", "origin"],
              rows: [
                ["AC-11902", "PO-55102", "FO-8834", "8", "22.00", "email"],
                ["AC-11902", "PO-55102", "FO-2210", "4", "31.50", "email"],
              ],
              note: "AC-11902 is Fernwood Furniture. The order belonged to Fern & Oak (AC-10287). This shipped.",
            },
          },
        ],
      },
      after: {
        label: "After 3-layer fix",
        stages: [
          {
            key: "classify",
            title: "Email Classification",
            caption: CAPTIONS.classify,
            artifact: {
              documentType: "purchase_order",
              confidence: 0.97,
              reasoning: "PO number, priced line items, known sender domain.",
            },
          },
          {
            key: "extract",
            title: "Extraction — OCR (PDF lane)",
        short: "Extract",
            caption: CAPTIONS.extractPdf,
            lane: "pdf",
            fields: [
              { id: "po_number", value: "PO-55102", confidence: 0.98 },
              { id: "order_date", value: "02 Jul 2026", confidence: 0.97 },
              {
                id: "store_name",
                value: "Fern & 0ak Homew∗res — Marlow Park",
                confidence: 0.83,
                verify: {
                  prompt: 'Verify the value in this crop. OCR read "Fern & 0ak Homew∗res" at 0.83.',
                  response: {
                    verifiedValue: "Fern & Oak Homewares — Marlow Park",
                    confidence: 0.94,
                    agreesWithOcr: false,
                  },
                  note: "Same noisy name — but this time the match won't depend on it.",
                },
              },
              { id: "delivery_address", value: "31 Garland Rd, Marlow Park VIC 3299", confidence: 0.96 },
              { id: "qty_line_1", value: "8", confidence: 0.98 },
              { id: "qty_line_2", value: "4", confidence: 0.97 },
            ],
          },
          { key: "verify", title: "LLM Verification", caption: CAPTIONS.verify },
          {
            key: "match",
            title: "Customer Matching",
            caption: "Layer 1: high-frequency senders resolve deterministically. The LLM never runs.",
            deterministic: {
              sender: "orders@fernandoak.example",
              accountId: "AC-10287",
              name: "Fern & Oak Homewares — Marlow Park",
              note: "Verified sender → account mapping hit. LLM matching skipped entirely.",
            },
            annotations: [
              "Layer 1 — verified sender → account mapping (what ran here)",
              "Layer 2 — tighter pre-filter: the LLM only ever sees a small, high-quality shortlist",
              "Layer 3 — post-selection gate: the pick must survive a name ↔ account cross-check before it takes effect",
            ],
          },
          {
            key: "validate",
            title: "Validation Gate",
            caption: "Layer 3 lives here now: the cross-check row that didn't exist in v1.",
            rules: [
              r(
                "customer_cross",
                "pass",
                "Fern & Oak Homewares ↔ AC-10287 — added in remediation; had the LLM still picked wrong, this row fails and routes to Zendesk"
              ),
              r("item_master", "pass", "2 of 2 item codes found"),
              r("price_present", "pass", "All lines priced"),
              r("price_tolerance", "pass", "Checked against AC-10287's price list — the right list this time"),
              r("line_count", "pass", "2 lines"),
              r("sales_origin", "pass", 'Set to "email"'),
            ],
          },
          {
            key: "outcome",
            title: "Outcome",
            caption: CAPTIONS.outcomeOk,
            kind: "csv",
            csv: {
              columns: ["account_id", "po_number", "item_code", "qty", "unit_price", "origin"],
              rows: [
                ["AC-10287", "PO-55102", "FO-8834", "8", "22.00", "email"],
                ["AC-10287", "PO-55102", "FO-2210", "4", "31.50", "email"],
              ],
              note: "Same document, same noise — different structure. The right account, deterministically.",
            },
          },
        ],
      },
    },
  },

  {
    id: "plu-as-itemcode",
    chipLabel: "PLU as item code",
    customer: "Gather Home Co.",
    docType: "PDF",
    badge: { tone: "amber", label: "Blocked → Human Review" },
    blurb: "OCR reads the PO faithfully — but the item codes are the customer's own vocabulary.",
    document: {
      kind: "pdf",
      docTitle: "PURCHASE ORDER",
      company: "Gather Home Co.",
      tagline: "Everyday homeware, gathered",
      accent: "#059669",
      meta: [
        { id: "po_number", label: "PO number", value: "PO GH-JUL-19" },
        { id: "order_date", label: "Order date", value: "16 Jul 2026" },
        { id: "store_name", label: "Store", value: "Gather Home Co. — Kingsford" },
        { id: "delivery_address", label: "Deliver to", value: "88 Loom St, Kingsford NSW 2872" },
      ],
      table: {
        columns: [
          { label: "PLU code", w: 0.24 },
          { label: "Description", w: 0.42 },
          { label: "Qty", w: 0.12 },
          { label: "Unit $", w: 0.22 },
        ],
        rows: [
          ["PLU-4471", "Rattan basket set", "6", "18.00"],
          ["PLU-4472", "Glass carafe 1L", "12", "9.40"],
          ["PLU-4473", "Cotton napkin pack", "24", "4.25"],
        ],
        fieldCells: { "0-0": "item_code_1", "1-0": "item_code_2", "2-0": "item_code_3" },
      },
      signature: true,
    },
    stages: [
      {
        key: "classify",
        title: "Email Classification",
        caption: CAPTIONS.classify,
        artifact: {
          documentType: "purchase_order",
          confidence: 0.96,
          reasoning: "PDF attachment with a PO number and priced line items; known sender domain.",
        },
      },
      {
        key: "extract",
        title: "Extraction — OCR (PDF lane)",
        short: "Extract",
        caption: CAPTIONS.extractPdf,
        lane: "pdf",
        fields: [
          { id: "po_number", value: "PO GH-JUL-19", confidence: 0.98 },
          { id: "order_date", value: "16 Jul 2026", confidence: 0.97 },
          { id: "store_name", value: "Gather Home Co. — Kingsford", confidence: 0.96 },
          { id: "delivery_address", value: "88 Loom St, Kingsford NSW 2872", confidence: 0.97 },
          { id: "item_code_1", value: "PLU-4471", confidence: 0.97 },
          { id: "item_code_2", value: "PLU-4472", confidence: 0.98 },
          { id: "item_code_3", value: "PLU-4473", confidence: 0.96 },
        ],
      },
      {
        key: "match",
        title: "Customer Matching",
        caption: CAPTIONS.match,
        prefilter: {
          filters: { suburb: "Kingsford", postcode: "2872", storeNameTokens: ["gather", "home"] },
          from: 19000,
          to: 1,
        },
        shortlist: [
          {
            accountId: "AC-14220",
            name: "Gather Home Co. — Kingsford",
            address: "88 Loom St, Kingsford",
            score: 0.95,
            pick: true,
            correct: true,
          },
        ],
      },
      {
        key: "validate",
        title: "Validation Gate",
        caption: CAPTIONS.validate,
        rules: [
          r("customer_cross", "pass", "Gather Home Co. ↔ AC-14220"),
          r(
            "item_master",
            "fail",
            "PLU-4471, PLU-4472, PLU-4473 — extracted faithfully, but every customer names item codes differently; these are Gather Home's own codes, and this account has no code whitelist yet"
          ),
          r("price_present", "pass", "All lines priced"),
          r("line_count", "pass", "3 lines"),
          r("sales_origin", "pass", 'Set to "email"'),
        ],
        fixNote:
          "Remediation: a per-customer item-code whitelist (customer code → internal code), applied before validation — per-customer vocabulary captured as data, not prompt text.",
      },
      {
        key: "outcome",
        title: "Outcome",
        caption: CAPTIONS.outcomeBlocked,
        kind: "ticket",
        ticket: {
          subject: "Order blocked — 3 unknown item codes (Gather Home Co., PO GH-JUL-19)",
          priority: "High",
          errors: [
            "Line 1: PLU-4471 not in product master",
            "Line 2: PLU-4472 not in product master",
            "Line 3: PLU-4473 not in product master",
          ],
          email:
            "Hi team — we received your July order but couldn't match the item codes PLU-4471, PLU-4472 and PLU-4473 against our catalogue. Could you confirm the corresponding product codes? We'll add them to your account's mapping so future orders go straight through.",
        },
      },
    ],
  },

  {
    id: "missing-price",
    chipLabel: "Missing price",
    customer: "Northgate Trading",
    docType: "Excel",
    badge: { tone: "amber", label: "Blocked → Human Review" },
    blurb: "Two price failures on one order. One ticket reports both.",
    document: {
      kind: "excel",
      filename: "northgate_po_0731.xlsx",
      columns: ["SKU", "Description", "Qty", "Unit $"],
      widths: [0.2, 0.44, 0.14, 0.22],
      rows: [
        ["NT-0705", "Pine bookshelf 5-tier", "3", "41.80"],
        ["NT-1120", "Desk lamp — matte black", "10", ""],
      ],
    },
    stages: [
      {
        key: "classify",
        title: "Email Classification",
        caption: CAPTIONS.classify,
        artifact: {
          documentType: "purchase_order",
          confidence: 0.96,
          reasoning: "Known template attachment from an established sender.",
        },
      },
      {
        key: "detect",
        title: "Template Detect (Excel lane)",
        short: "Detect",
        caption: CAPTIONS.detect,
        artifact: {
          senderCheck: {
            sender: "orders@northgatetrading.example",
            hit: true,
            template: "Template #3",
            customer: "Northgate Trading · AC-17708",
          },
          structureCheck: null,
          result: "Template #3",
        },
      },
      {
        key: "extract",
        title: "Parse — Template #3 script",
        short: "Parse",
        caption: CAPTIONS.extractScript,
        lane: "excel-script",
        artifact: {
          templateMatch: "Template #3",
          lane: "deterministic",
          note: "Template matched — deterministic parse. The extraction is perfect; the data itself has problems.",
          rows: [
            { item_code: "NT-0705", qty: 3, unit_price: 41.8 },
            { item_code: "NT-1120", qty: 10, unit_price: null },
          ],
        },
      },
      {
        key: "validate",
        title: "Validation Gate",
        caption: CAPTIONS.validate,
        rules: [
          r("customer_cross", "pass", "Account pinned by detect — sender ↔ AC-17708, one-to-one; no fuzzy matching in this lane"),
          r("address_exact", "pass", "Sheet address matches the AC-17708 record exactly (a mismatch routes to a human: “has the customer moved?”)"),
          r("item_master", "pass", "2 of 2 item codes found"),
          r("price_present", "fail", "Line 2 (NT-1120): unit price empty"),
          r("price_tolerance", "fail", "Line 1 (NT-0705): $41.80 vs price list $31.20 — +34% deviation"),
          r("line_count", "pass", "2 lines"),
          r("sales_origin", "pass", 'Set to "email"'),
        ],
      },
      {
        key: "outcome",
        title: "Outcome",
        caption: CAPTIONS.outcomeBlocked,
        kind: "ticket",
        ticket: {
          subject: "Order blocked — 2 price issues (Northgate Trading, PO NT-0731)",
          priority: "Normal",
          errors: [
            "Line 1 (NT-0705): price $41.80 deviates +34% from price list ($31.20)",
            "Line 2 (NT-1120): unit price missing",
          ],
          email:
            "Hi team — quick check on your PO NT-0731 before we process it: line 1 (NT-0705) is priced at $41.80 against a list price of $31.20, and line 2 (NT-1120) has no unit price. Could you confirm both?",
        },
      },
    ],
  },

  {
    id: "unknown-template",
    chipLabel: "Unknown template",
    customer: "Maple & March Trading",
    docType: "Excel",
    badge: { tone: "amber", label: "Routed — unknown template" },
    blurb: "A format the scripts don't know. It queues for a human — never for an LLM.",
    document: {
      kind: "excel",
      filename: "mm_order_form_v2.xlsx",
      columns: ["Ref", "Product", "Units", "AUD"],
      widths: [0.18, 0.46, 0.14, 0.22],
      rows: [
        ["MM-118", "Jute rug 2x3m", "5", "48.00"],
        ["MM-204", "Brass wall hook set", "18", "6.50"],
      ],
    },
    stages: [
      {
        key: "classify",
        title: "Email Classification",
        caption: CAPTIONS.classify,
        artifact: {
          documentType: "purchase_order",
          confidence: 0.94,
          reasoning: "Spreadsheet with quantities and prices; subject reads “order form attached”.",
        },
      },
      {
        key: "detect",
        title: "Template Detect (Excel lane)",
        short: "Detect",
        caption: CAPTIONS.detect,
        stops: "Unknown template — routed to human entry, outside this flow.",
        artifact: {
          senderCheck: { sender: "orders@mapleandmarch.example", hit: false },
          structureCheck: { checked: 8, match: null },
          result: "unknown",
        },
      },
      { key: "extract", title: "Parse", notReached: "Not reached — no template, no parse. Nothing guesses." },
      { key: "validate", title: "Validation Gate", notReached: "Not reached — the order is handled by a human" },
      {
        key: "outcome",
        title: "Outcome",
        caption:
          "Unknowns are also collected outside this flow: an LLM agent in Container Apps clusters them by structure, and when a cluster accumulates enough volume it graduates into a new template script.",
        kind: "routed",
        routed: {
          title: "Queued for human entry — no parse attempted",
          detail:
            "The order is processed manually today. Meanwhile its format joins the unknown-template pool; structural clustering decides which format earns the ninth script. The LLM classifies formats — it never extracts order data.",
        },
      },
    ],
  },

  {
    id: "empty-lines",
    chipLabel: "Empty lines",
    customer: "Beacon Retail Group",
    docType: "PDF",
    badge: { tone: "amber", label: "Blocked → Human Review" },
    blurb: "The table OCR missed. In v1 this order was actually created empty.",
    document: {
      kind: "pdf",
      docTitle: "PURCHASE ORDER",
      company: "Beacon Retail Group",
      tagline: "Regional retail, done properly",
      accent: "#c26a22",
      meta: [
        { id: "po_number", label: "PO number", value: "PO-70233" },
        { id: "order_date", label: "Order date", value: "19 Jul 2026" },
        { id: "store_name", label: "Store", value: "Beacon Retail Group — Marlow Park" },
        { id: "delivery_address", label: "Deliver to", value: "Dock 3, 7 Beacon Way, Marlow Park VIC 3299" },
      ],
      ghostTable: true,
      signature: true,
    },
    stages: [
      {
        key: "classify",
        title: "Email Classification",
        caption: CAPTIONS.classify,
        artifact: {
          documentType: "purchase_order",
          confidence: 0.96,
          reasoning: "PO number and delivery details present; sender is a known trading partner.",
        },
      },
      {
        key: "extract",
        title: "Extraction — OCR (PDF lane)",
        short: "Extract",
        caption: "Header fields read fine. The line-item table — skewed, low-contrast — was never detected.",
        lane: "pdf",
        fields: [
          { id: "po_number", value: "PO-70233", confidence: 0.98 },
          { id: "order_date", value: "19 Jul 2026", confidence: 0.97 },
          { id: "store_name", value: "Beacon Retail Group — Marlow Park", confidence: 0.97 },
          { id: "delivery_address", value: "Dock 3, 7 Beacon Way, Marlow Park VIC 3299", confidence: 0.96 },
          { id: "line_items", value: "[] — table region not detected", confidence: null, noBox: true },
        ],
      },
      {
        key: "match",
        title: "Customer Matching",
        caption: CAPTIONS.match,
        prefilter: {
          filters: { suburb: "Marlow Park", postcode: "3299", storeNameTokens: ["beacon"] },
          from: 19000,
          to: 1,
        },
        shortlist: [
          {
            accountId: "AC-13342",
            name: "Beacon Retail Group — Marlow Park",
            address: "7 Beacon Way, Marlow Park",
            score: 0.98,
            pick: true,
            correct: true,
          },
        ],
      },
      {
        key: "validate",
        title: "Validation Gate",
        caption: CAPTIONS.validate,
        rules: [
          r("customer_cross", "pass", "Beacon Retail Group ↔ AC-13342"),
          r("line_count", "fail", "0 line items — in v1 this order was actually created empty; this rule exists because of that"),
          r("item_master", "absent", "Nothing to check — no lines"),
          r("price_present", "absent", "Nothing to check — no lines"),
          r("sales_origin", "pass", 'Set to "email"'),
        ],
      },
      {
        key: "outcome",
        title: "Outcome",
        caption: CAPTIONS.outcomeBlocked,
        kind: "ticket",
        ticket: {
          subject: "Order blocked — no line items detected (Beacon Retail Group, PO-70233)",
          priority: "High",
          errors: ["Line item count = 0 — table region not detected in the PDF"],
          email:
            "Hi team — we received PO-70233 but couldn't read the item table from the PDF (the scan is quite faint). Could you resend it, or reply with the lines as text? We'll process it immediately.",
        },
      },
    ],
  },

  {
    id: "claim-not-order",
    chipLabel: "Claim, not order",
    customer: "Willow Lane Gifts",
    docType: "PDF",
    entryCase: true,
    badge: { tone: "amber", label: "Routed — not an order" },
    blurb: "A credit claim that would have become a phantom order in a naive flow.",
    document: {
      kind: "pdf",
      docTitle: "CREDIT CLAIM",
      company: "Willow Lane Gifts",
      tagline: "Gifts & paper goods",
      accent: "#c24135",
      meta: [
        { id: "claim_ref", label: "Claim ref", value: "CR-2214" },
        { id: "invoice_ref", label: "Invoice ref", value: "INV-30412" },
        { id: "claim_date", label: "Date", value: "21 Jul 2026" },
      ],
      bodyLines: [
        "Requesting credit for 4 damaged units received 28 Jun 2026.",
        "Items arrived with cracked glazing; photos attached.",
        "Please credit against invoice INV-30412.",
      ],
      signature: true,
    },
    stages: [
      {
        key: "classify",
        title: "Email Classification",
        caption: CAPTIONS.classify,
        stops: "Routed to the Claims process — the order pipeline never starts.",
        artifact: {
          documentType: "claim",
          confidence: 0.87,
          reasoning:
            "Reference CR-2214 matches claim pattern CR-####; document references existing invoice INV-30412; no priced line items.",
        },
      },
      { key: "extract", title: "Extraction", notReached: "Not reached — routed to Claims process" },
      { key: "match", title: "Customer Matching", notReached: "Not reached — routed to Claims process" },
      { key: "validate", title: "Validation Gate", notReached: "Not reached — routed to Claims process" },
      {
        key: "outcome",
        title: "Outcome",
        caption: "Only documents classified as purchase orders enter order creation. Everything else routes to its own queue.",
        kind: "routed",
        routed: {
          title: "Routed to Claims — no order created",
          detail:
            "In an earlier iteration, claims like this one were treated as orders and invoice numbers became order references. Classification now runs as its own gate before any extraction happens.",
        },
      },
    ],
  },

  {
    id: "token-blowup",
    chipLabel: "Token blow-up",
    customer: "Sunmark Wholesale Outlet",
    docType: "PDF",
    badge: { tone: "amber", label: "Blocked → Human Review" },
    blurb: "An unreadable postcode degrades the pre-filter — and fails loudly.",
    document: {
      kind: "pdf",
      docTitle: "PURCHASE ORDER",
      company: "Sunmark Wholesale Outlet",
      tagline: "Volume wholesale supply",
      accent: "#4258ff",
      meta: [
        { id: "po_number", label: "PO number", value: "PO-91448" },
        { id: "order_date", label: "Order date", value: "20 Jul 2026" },
        { id: "store_name", label: "Store", value: "Sunmark Wholesale Outlet — Westhaven" },
        { id: "delivery_address", label: "Deliver to", value: "Depot 2, 44 Foundry Rd, Westhaven" },
        { id: "postcode", label: "Postcode", value: "3877", display: "3█7█7", smudge: true },
      ],
      table: {
        columns: [
          { label: "Item code", w: 0.24 },
          { label: "Description", w: 0.42 },
          { label: "Qty", w: 0.12 },
          { label: "Unit $", w: 0.22 },
        ],
        rows: [
          ["SM-5501", "Storage tub 60L (x4)", "40", "12.10"],
          ["SM-5620", "Shelf bracket pair", "60", "3.80"],
        ],
        fieldCells: { "0-2": "qty_line_1", "1-2": "qty_line_2" },
      },
      signature: true,
    },
    stages: [
      {
        key: "classify",
        title: "Email Classification",
        caption: CAPTIONS.classify,
        artifact: {
          documentType: "purchase_order",
          confidence: 0.97,
          reasoning: "PO number, priced line items, known sender domain.",
        },
      },
      {
        key: "extract",
        title: "Extraction — OCR (PDF lane)",
        short: "Extract",
        caption: CAPTIONS.extractPdf,
        lane: "pdf",
        fields: [
          { id: "po_number", value: "PO-91448", confidence: 0.97 },
          { id: "order_date", value: "20 Jul 2026", confidence: 0.96 },
          { id: "store_name", value: "Sunmark Wholesale Outlet — Westhaven", confidence: 0.95 },
          { id: "delivery_address", value: "Depot 2, 44 Foundry Rd, Westhaven", confidence: 0.96 },
          {
            id: "postcode",
            value: "3█7█7",
            confidence: 0.42,
            verify: {
              prompt: 'Verify the value in this crop. OCR read "3█7█7" at 0.42.',
              response: { verifiedValue: "unreadable — print damage", confidence: 0.55, agreesWithOcr: false },
              failed: true,
              note: "The crop is too degraded to recover. Verification is allowed to fail — what happens next is what matters.",
            },
          },
          { id: "qty_line_1", value: "40", confidence: 0.97 },
          { id: "qty_line_2", value: "60", confidence: 0.96 },
        ],
      },
      { key: "verify", title: "LLM Verification", caption: CAPTIONS.verify },
      {
        key: "match",
        title: "Customer Matching",
        caption: "With the postcode gone, the pre-filter degenerates — and the failure is loud.",
        prefilter: {
          filters: { suburb: "Westhaven", postcode: "— dropped (unreadable)", storeNameTokens: ["sunmark"] },
          from: 19000,
          to: 1914,
        },
        error: {
          title: "Candidate payload exceeds token limit",
          detail:
            "1,914 candidates after the degraded pre-filter ≈ 210k tokens. The request is aborted before the LLM is ever called.",
          note: "Loud failures are the easy ones — they page you.",
        },
      },
      { key: "validate", title: "Validation Gate", notReached: "Not reached — matching failed loudly" },
      {
        key: "outcome",
        title: "Outcome",
        caption: "The pipeline refuses to guess. A human resolves the postcode; the order re-enters the flow.",
        kind: "error",
        error: {
          title: "Routed to human review",
          detail:
            "Ticket raised with the original PDF, the unreadable-postcode diagnosis, and the 1,914-candidate filter state. No order was created, nothing was guessed — and nobody had to discover this by accident.",
        },
      },
    ],
  },
];
