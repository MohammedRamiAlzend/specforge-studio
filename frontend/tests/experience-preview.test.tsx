import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ExperienceIcon, ExperiencePreview } from "../src/widgets/experience/ExperiencePreview";

function render(kind: "business-model" | "presentation") {
  return renderToStaticMarkup(
    <div>
      <ExperienceIcon kind={kind} />
      <ExperiencePreview kind={kind} />
    </div>,
  );
}

describe("experience previews", () => {
  it("renders the Business Model preview vocabulary", () => {
    const html = render("business-model");
    expect(html).toContain("Business Model Canvas");
    expect(html).toContain("Value");
    expect(html).toContain("Revenue");
  });

  it("renders the Presentation preview vocabulary", () => {
    const html = render("presentation");
    expect(html).toContain("Pitch Presentation");
    expect(html).toContain("01 / 04");
    expect(html).toContain("Download .pptx");
  });
});
