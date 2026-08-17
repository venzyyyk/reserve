import type { Meta, StoryObj } from "@storybook/nextjs";

/**
 * Token reference — the design system's own page. Values are read from the
 * live stylesheet, so this cannot drift from the implementation.
 */
const meta = {
  title: "Cue/Tokens",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const COLORS = [
  ["bg", "--color-bg"],
  ["surface-1", "--color-surface-1"],
  ["surface-2", "--color-surface-2"],
  ["surface-3", "--color-surface-3"],
  ["gold", "--color-gold"],
  ["felt", "--color-felt"],
  ["danger", "--color-danger"],
  ["table-busy", "--color-table-busy"],
  ["table-reserved", "--color-table-reserved"],
] as const;

export const Colors: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {COLORS.map(([name, variable]) => (
        <div key={name} className="flex items-center gap-3">
          <span
            className="border-line size-12 shrink-0 rounded-md border"
            style={{ background: `var(${variable})` }}
          />
          <span className="text-label text-fg-2">{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <p className="font-display text-display-xl text-fg">Display XL · 56</p>
      <p className="font-display text-display text-fg">Display · 36</p>
      <p className="font-display text-title text-fg">Title · 24</p>
      <p className="text-heading text-fg font-semibold">Heading · 18/600</p>
      <p className="text-body text-fg">
        Body · 15 — основний текст інтерфейсу.
      </p>
      <p className="text-label text-fg-2">Label · 13</p>
      <p className="text-caption text-fg-3">Caption · 12</p>
      <p className="text-price text-fg font-semibold tabular-nums">
        250 ₴ · Price 20/600
      </p>
    </div>
  ),
};

export const Elevation: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-3">
      {["shadow-elev-1", "shadow-elev-2", "shadow-elev-3"].map((level) => (
        <div
          key={level}
          className={`bg-surface-1 text-label text-fg-2 grid h-24 place-items-center rounded-lg ${level}`}
        >
          {level}
        </div>
      ))}
      <div className="bg-surface-1 text-label text-gold shadow-glow-gold grid h-24 place-items-center rounded-lg">
        glow-gold
      </div>
      <div className="bg-surface-1 text-label shadow-glow-felt grid h-24 place-items-center rounded-lg text-[#6FBF73]">
        glow-felt
      </div>
    </div>
  ),
};

export const Radius: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {[
        "rounded-sm",
        "rounded-md",
        "rounded-lg",
        "rounded-xl",
        "rounded-full",
      ].map((radius) => (
        <div
          key={radius}
          className={`bg-surface-2 text-caption text-fg-2 grid size-24 place-items-center ${radius}`}
        >
          {radius}
        </div>
      ))}
    </div>
  ),
};
