import type { Meta, StoryObj } from "@storybook/nextjs";
import { CalendarX, Heart } from "lucide-react";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Chip } from "./chip";
import { EmptyState } from "./empty-state";
import { Select } from "./select";
import { Skeleton } from "./skeleton";
import { Spinner } from "./spinner";
import { Toggle } from "./toggle";
import { Tooltip, TooltipProvider } from "./tooltip";
import { Breadcrumbs } from "./breadcrumbs";

/**
 * Grouped catalogue of the remaining primitives. Each story documents the
 * states that exist for that component — components with no meaningful
 * loading/error state say so explicitly rather than faking one.
 */
const meta = {
  title: "Cue/Primitives",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Badges: Story = {
  name: "Badge — variants + live",
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>Нейтральний</Badge>
      <Badge variant="gold">Зачиняється о 23:00</Badge>
      <Badge variant="felt" live>
        Відчинено до 02:00
      </Badge>
      <Badge variant="danger">Скасовано</Badge>
    </div>
  ),
};

export const Chips: Story = {
  name: "Chip — default / selected / disabled",
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Chip>Руський</Chip>
      <Chip selected>Пул</Chip>
      <Chip disabled>Снукер</Chip>
    </div>
  ),
};

export const Cards: Story = {
  name: "Card — static vs interactive",
  render: () => (
    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Статична картка</CardTitle>
        </CardHeader>
        <CardContent className="text-body text-fg-2">
          Без hover-стану.
        </CardContent>
      </Card>
      <Card interactive>
        <CardHeader>
          <CardTitle>Інтерактивна</CardTitle>
        </CardHeader>
        <CardContent className="text-body text-fg-2">
          Підіймається на hover.
        </CardContent>
      </Card>
    </div>
  ),
};

export const Selects: Story = {
  name: "Select — default / error / disabled",
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <Select
        label="Місто"
        options={[
          { value: "kyiv", label: "Київ" },
          { value: "lviv", label: "Львів" },
        ]}
      />
      <Select
        label="Місто"
        options={[{ value: "", label: "—" }]}
        error="Оберіть місто"
      />
      <Select label="Місто" options={[{ value: "", label: "—" }]} disabled />
    </div>
  ),
};

export const Toggles: Story = {
  name: "Toggle — off / on / disabled",
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <Toggle label="Нагадування у Telegram" />
      <Toggle label="Email про акції" defaultChecked />
      <Toggle label="Звуки інтерфейсу" disabled />
    </div>
  ),
};

export const LoadingStates: Story = {
  name: "Loading — Skeleton (content) vs Spinner (action)",
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-sm flex-col gap-2">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="flex items-center gap-4">
        <Spinner />
        <Button variant="primary" loading>
          Оплатити
        </Button>
      </div>
    </div>
  ),
};

export const Empty: Story = {
  name: "EmptyState",
  render: () => (
    <EmptyState
      icon={CalendarX}
      title="Бронювань ще немає"
      description="Оберіть клуб і забронюйте стіл — він з'явиться тут."
      action={<Button variant="primary">Обрати клуб</Button>}
    />
  ),
};

export const AvatarsAndTooltips: Story = {
  name: "Avatar + Tooltip",
  render: () => (
    <TooltipProvider>
      <div className="flex items-center gap-4">
        <Avatar name="Олег Ковальчук" />
        <Avatar name="Ірина" size={48} />
        <Tooltip content="Стіл №4 · Руський · 250 ₴/год">
          <button
            type="button"
            className="bg-surface-2 text-label text-fg rounded-full px-4 py-2"
          >
            Наведіть на мене
          </button>
        </Tooltip>
        <Heart aria-hidden className="text-gold" size={20} />
      </div>
    </TooltipProvider>
  ),
};

export const BreadcrumbTrail: Story = {
  name: "Breadcrumbs",
  render: () => (
    <Breadcrumbs
      label="Хлібні крихти"
      items={[
        { name: "Головна", href: "/" },
        { name: "Більярдні клуби", href: "/clubs" },
        { name: "Київ", href: "/clubs/kyiv" },
      ]}
    />
  ),
};
