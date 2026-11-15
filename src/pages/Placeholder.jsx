import { email, to } from "../shared/site.js";

function PlaceholderPage() {
  return (
    <section className="placeholder-page">
      <div className="grid-bg" />
      <h1 tabIndex={-1}>Case study in progress</h1>
      <p>
        This write-up is not published yet. I am happy to walk through it live — reach out
        at <a href={`mailto:${email}`}>{email}</a>.
      </p>
      <a href={to("")}>Back to home</a>
    </section>
  );
}

export default PlaceholderPage;
