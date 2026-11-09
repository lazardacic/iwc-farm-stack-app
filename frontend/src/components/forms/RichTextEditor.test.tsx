import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import RichTextEditor from "./RichTextEditor";

const renderEditor = (value = "<p>Hello world</p>", error?: string) => {
  const onChange = vi.fn();
  render(<RichTextEditor label="Description" value={value} onChange={onChange} error={error} />);
  return { onChange, textbox: screen.getByRole("textbox", { name: "Description" }) };
};

describe("RichTextEditor", () => {
  it("shows the starting HTML in a labelled textbox", async () => {
    const { textbox } = renderEditor("<h2>Old town</h2><p>Narrow streets</p>");

    await waitFor(() => expect(textbox.querySelector("h2")).toHaveTextContent("Old town"));
    expect(textbox).toHaveTextContent("Narrow streets");
  });

  it("offers only the formatting the backend keeps", () => {
    renderEditor();

    const toolbar = screen.getByRole("toolbar", { name: "Description formatting" });
    const names = Array.from(toolbar.querySelectorAll("button")).map((button) =>
      button.getAttribute("aria-label"),
    );
    expect(names).toEqual([
      "Bold",
      "Italic",
      "Heading",
      "Subheading",
      "Bullet list",
      "Numbered list",
      "Quote",
      "Undo",
      "Redo",
    ]);
  });

  it("reports HTML and plain text when formatting changes", async () => {
    const { onChange } = renderEditor("<p>Hello world</p>");

    fireEvent.click(screen.getByRole("button", { name: "Bullet list" }));

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith("<ul><li><p>Hello world</p></li></ul>", "Hello world"),
    );
    expect(screen.getByRole("button", { name: "Bullet list" })).toHaveAttribute("aria-pressed", "true");
  });

  it("marks the textbox invalid and links the error", () => {
    const { textbox } = renderEditor("", "Description must contain at least 30 characters");

    expect(textbox).toHaveAttribute("aria-invalid", "true");
    expect(textbox).toHaveAccessibleDescription("Description must contain at least 30 characters");
  });
});
