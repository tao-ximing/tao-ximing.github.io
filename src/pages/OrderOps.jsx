import PipelineInspector from "../orderops/PipelineInspector.jsx";
import OrderSandbox from "../orderops/sandbox/OrderSandbox.jsx";
import MotionRoot from "../shared/MotionRoot.jsx";

const IMPACT = [
  { value: "95%", label: "field extraction accuracy" },
  { value: "70%", label: "eligible orders fully automated" },
  { value: "2h", label: "saved per support user/day" },
  { value: "20", label: "support users in workflow" },
];

function OrderOpsPage() {
  return (
    <MotionRoot>
      <section className="sandbox-section">
        <OrderSandbox />
        <ImpactStrip />
      </section>
      <PipelineInspector />
    </MotionRoot>
  );
}

function ImpactStrip() {
  return (
    <div className="impact-strip">
      {IMPACT.map((item) => (
        <div key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default OrderOpsPage;
