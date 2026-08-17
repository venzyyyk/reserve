import type { Meta, StoryObj } from "@storybook/nextjs";
import type { Club } from "@/entities/club";
import { ClubCard } from "./club-card";

const club: Club = {
  id: "clb_demo",
  slug: "klasyk",
  city: "kyiv",
  name: "Класик",
  story: "Найстаріший клуб Печерська.",
  about: [],
  address: {
    street: "вул. Саксаганського, 12",
    district: "Печерськ",
    metro: { name: "Палац Спорту", walkMinutes: 6 },
  },
  phone: "+380442001234",
  hours: {
    mon: { open: "12:00", close: "02:00" },
    tue: { open: "12:00", close: "02:00" },
    wed: { open: "12:00", close: "02:00" },
    thu: { open: "12:00", close: "02:00" },
    fri: { open: "12:00", close: "04:00" },
    sat: { open: "14:00", close: "04:00" },
    sun: { open: "14:00", close: "00:00" },
  },
  tables: [
    { type: "russian", count: 8, pricePerHourFrom: 25000 },
    { type: "pool", count: 4, pricePerHourFrom: 20000 },
  ],
  amenities: ["bar", "vip_rooms"],
  featured: true,
  published: true,
  onlineBooking: true,
  accentHue: 145,
};

const meta = {
  title: "Widgets/ClubCard",
  component: ClubCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Catalog card. The cover is the designed no-photo state: a club-hue " +
          "felt gradient with an overhead lamp wash and the club monogram — " +
          "most Ukrainian clubs will onboard without usable photography. " +
          "Open/closed status hydrates on the client because pages are static.",
      },
    },
  },
  args: { club },
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ClubCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ClosedToday: Story = {
  args: {
    club: {
      ...club,
      name: "Абріколь",
      accentHue: 210,
      hours: {
        ...club.hours,
        mon: null,
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sun: null,
      },
    },
  },
};

export const SingleTableType: Story = {
  args: {
    club: {
      ...club,
      name: "Піраміда",
      accentHue: 30,
      tables: [{ type: "snooker", count: 2, pricePerHourFrom: 30000 }],
    },
  },
};

export const NoMetro: Story = {
  args: {
    club: {
      ...club,
      name: "Ланжерон",
      accentHue: 190,
      address: { street: "Ланжеронівський узвіз, 2", district: "Приморський" },
    },
  },
};

export const Grid: Story = {
  name: "Responsive grid",
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="grid w-full max-w-[1100px] gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Story />
        <Story />
        <Story />
      </div>
    ),
  ],
};
