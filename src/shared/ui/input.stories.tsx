import type { Meta, StoryObj } from "@storybook/nextjs";
import { Input } from "./input";

const meta = {
  title: "Cue/Input",
  component: Input,
  parameters: {
    docs: {
      description: {
        component:
          "Label is always rendered and always associated. Errors use role=alert " +
          "plus aria-describedby and replace the hint — never both. Height 48px " +
          "keeps the touch target comfortable on mobile (MPS §3).",
      },
    },
  },
  args: { label: "Номер телефону", placeholder: "+380 __ ___ __ __" },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithHint: Story = {
  args: { hint: "Надішлемо код підтвердження" },
};
export const Error: Story = { args: { error: "Перевірте номер телефону" } };
export const Disabled: Story = {
  args: { disabled: true, value: "+380 44 200 12 34" },
};

export const Focused: Story = {
  play: async ({ canvas }) => {
    canvas.getByLabelText("Номер телефону").focus();
  },
};

export const Loading: Story = {
  args: { disabled: true, value: "Перевіряємо…" },
  parameters: {
    docs: {
      description: {
        story:
          "Inputs have no spinner state: pending work belongs to the submit " +
          "button, the field simply locks (MPS §3 loading contract).",
      },
    },
  },
};
