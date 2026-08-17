import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../button";

describe("Button", () => {
  it("renders and handles clicks", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Забронювати</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Забронювати" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("blocks interaction and sets aria-busy while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Оплатити
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("defaults to type=button (no accidental form submits)", () => {
    render(<Button>Дія</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
