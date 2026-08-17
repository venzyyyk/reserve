import { render, screen } from "@testing-library/react";
import { Input } from "../input";

describe("Input", () => {
  it("associates label with input", () => {
    render(<Input label="Телефон" />);
    expect(screen.getByLabelText("Телефон")).toBeInTheDocument();
  });

  it("exposes errors via role=alert and aria-describedby", () => {
    render(<Input label="Телефон" error="Перевірте номер" />);
    const input = screen.getByLabelText("Телефон");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Перевірте номер");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("prefers error over hint", () => {
    render(<Input label="Телефон" hint="У форматі +380" error="Помилка" />);
    expect(screen.queryByText("У форматі +380")).not.toBeInTheDocument();
  });
});
