import type { Meta, StoryObj } from "@storybook/nextjs";
import { Button } from "./button";

const meta = {
  title: "Cue/Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          "Primary action. Gold budget: at most one `primary` per view (MPS §6). " +
          "Hover raises to gold-hover; focus draws a white ring on gold surfaces " +
          "(gold-on-gold would fail contrast); active scales to 0.98; loading keeps " +
          "width and sets aria-busy so layout never jumps.",
      },
    },
  },
  args: { children: "Забронювати" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Danger: Story = {
  args: { variant: "danger", children: "Скасувати бронювання" },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Button {...args} size="sm" />
      <Button {...args} size="md" />
      <Button {...args} size="lg" />
    </div>
  ),
  args: { variant: "primary" },
};

export const Loading: Story = { args: { variant: "primary", loading: true } };
export const Disabled: Story = { args: { variant: "primary", disabled: true } };

export const Focused: Story = {
  args: { variant: "primary" },
  parameters: {
    docs: {
      description: { story: "Focus ring as rendered by keyboard navigation." },
    },
  },
  play: async ({ canvas }) => {
    canvas.getByRole("button").focus();
  },
};

export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="primary">
        Default
      </Button>
      <Button {...args} variant="primary" loading>
        Loading
      </Button>
      <Button {...args} variant="primary" disabled>
        Disabled
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="danger">
        Danger
      </Button>
    </div>
  ),
};
