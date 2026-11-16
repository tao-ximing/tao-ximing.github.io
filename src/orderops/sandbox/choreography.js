import { WIRES } from "./cases.js";

/**
 * The scripted run for one sandbox case. It drives React state through `view`
 * setters and the SVG trails / token / progress bars through element getters,
 * and every wait goes through the run clock so Pause and cancel apply to all.
 *
 * @typedef {import("./cases.js").SandboxCase} SandboxCase
 * @typedef {import("./cases.js").Line} Line
 * @typedef {{
 *   isReduced: () => boolean,
 *   trail: (key: string) => SVGPathElement,
 *   token: () => HTMLElement,
 *   bar: (key: string) => HTMLElement,
 *   setNode: (key: string, state: string) => void,
 *   addLine: (key: string, line: Line) => void,
 *   setLines: (key: string, lines: Line[]) => void,
 *   setLineTone: (key: string, index: number, tone: string) => void,
 *   log: (key: string, text: string) => void,
 *   setToken: (label: string, tone: string) => void,
 * }} SandboxView
 * @typedef {{ clock: import("./runClock.js").RunClock, view: SandboxView }} RunContext
 */

const EASE = "cubic-bezier(.45,.05,.3,1)";
const MIN_TRAVEL_MS = 800;
const MAX_TRAVEL_MS = 1500;
const MS_PER_PX = 4.2;
const STEP_MS = 640;
const RULE_TICK_MS = 380;

/**
 * Move the token along one wire while its trail draws in. In reduced motion
 * the trail fades in instead and the token does not move.
 * @param {RunContext} ctx
 */
async function travel({ clock, view }, trailKey, label, tone, d = WIRES[trailKey]) {
  const trail = view.trail(trailKey);
  trail.setAttribute("d", d);
  trail.setAttribute("data-tone", tone);
  view.setToken(label, tone);

  if (view.isReduced()) {
    trail.style.strokeDashoffset = "0";
    await clock.play(trail.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: "forwards" }));
    await clock.sleep(250);
    return;
  }

  const duration = Math.min(MAX_TRAVEL_MS, Math.max(MIN_TRAVEL_MS, trail.getTotalLength() * MS_PER_PX));
  const token = view.token();
  token.style.offsetPath = `path("${d}")`;
  const move = token.animate(
    [
      { offsetDistance: "0%", opacity: 0, transform: "scale(.85)" },
      { opacity: 1, transform: "scale(1)", offset: 0.14 },
      { opacity: 1, transform: "scale(1)", offset: 0.86 },
      { offsetDistance: "100%", opacity: 0, transform: "scale(.85)" },
    ],
    { duration, easing: EASE, fill: "forwards" },
  );
  const draw = trail.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration, easing: EASE, fill: "forwards" });
  await Promise.all([clock.play(move), clock.play(draw)]);
}

/**
 * Light a node up and list what it produced, one line at a time.
 * @param {RunContext} ctx
 * @param {string} key
 * @param {Line[]} lines
 */
async function work({ clock, view }, key, lines, final = "done") {
  view.setNode(key, "working");
  let untrack = null;
  if (!view.isReduced()) {
    const bar = view.bar(key).animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      duration: lines.length * STEP_MS,
      easing: "linear",
      fill: "forwards",
    });
    untrack = clock.track(bar);
  }
  for (const line of lines) {
    await clock.sleep(STEP_MS * 0.45);
    view.addLine(key, line);
    await clock.sleep(STEP_MS * 0.55);
  }
  untrack?.();
  view.setNode(key, final);
}

/**
 * Show every rule as pending, then tick them off in order.
 * @param {RunContext} ctx
 * @param {[string, boolean][]} rules
 * @returns {Promise<boolean>} whether every rule passed
 */
async function gate({ clock, view }, rules) {
  view.setLines("gate", rules.map(([text]) => [text, "pending"]));
  view.setNode("gate", "working");
  for (const [index, [, ok]] of rules.entries()) {
    await clock.sleep(RULE_TICK_MS);
    view.setLineTone("gate", index, ok ? "ok" : "bad");
  }
  await clock.sleep(300);
  const passed = rules.every(([, ok]) => ok);
  view.setNode("gate", passed ? "done" : "blocked");
  return passed;
}

/**
 * Play one order from the inbox to its outcome.
 * @param {SandboxCase} c
 * @param {RunContext} ctx
 * @param {string} entryD the curve from the clicked inbox row
 */
export async function runCase(c, ctx, entryD) {
  const { view } = ctx;
  const lane = c.kind;
  const otherLane = lane === "pdf" ? "excel" : "pdf";

  view.log("inbox", c.log.arrive);
  await travel(ctx, "entry", c.file, c.kind, entryD);

  view.log("classify", c.log.classify);
  await work(ctx, "classify", c.classify);
  view.setNode(otherLane, "skipped");
  await travel(ctx, lane, "purchase_order", c.kind);

  view.log(lane, c.log.lane);
  if (c.outcome === "unknown") {
    await work(ctx, lane, c.lane, "blocked");
    view.setNode("gate", "skipped");
    view.setNode("sftp", "skipped");
    await travel(ctx, "unknown", "unknown format", "ticket");
    view.log("human", c.log.end);
    await work(ctx, "human", c.end, "blocked");
    return;
  }

  await work(ctx, lane, c.lane);
  await travel(ctx, lane === "pdf" ? "pdfGate" : "excelGate", c.payload, "json");

  view.log("gate", c.log.gate);
  const passed = await gate(ctx, c.rules);
  const lineCount = c.payload.split("· ")[1];
  const [target, unused, wire, label, tone] = passed
    ? ["sftp", "human", "pass", `CSV · ${lineCount}`, "csv"]
    : ["human", "sftp", "fail", "ticket", "ticket"];
  view.setNode(unused, "skipped");
  await travel(ctx, wire, label, tone);
  view.log(target, c.log.end);
  await work(ctx, target, c.end, passed ? "done" : "blocked");
}
