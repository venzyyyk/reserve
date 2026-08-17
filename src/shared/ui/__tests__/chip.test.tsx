import { render, screen } from "@testing-library/react";
import { Chip } from "../chip";

describe("Chip", () => {
  it("communicates selection via aria-pressed, not color alone", () => {
    const { rerender } = render(<Chip>Руський</Chip>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    rerender(<Chip selected>Руський</Chip>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });
});
