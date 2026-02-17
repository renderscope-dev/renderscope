import type { Meta, StoryObj } from "@storybook/react";
import { HelloRenderScope } from "./HelloRenderScope";

const meta: Meta<typeof HelloRenderScope> = {
  title: "Demo/HelloRenderScope",
  component: HelloRenderScope,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Demo component that verifies the full build pipeline works: " +
          "TypeScript → Rollup → ESM/CJS, CSS custom properties, and Storybook. " +
          "This component will be replaced by real components in Phase 22.",
      },
    },
  },
  argTypes: {
    title: {
      control: "text",
      description: "Title text displayed at the top of the card",
    },
    tagline: {
      control: "text",
      description: "Subtitle/tagline text below the title",
    },
    className: {
      control: "text",
      description: "Additional CSS class name",
    },
  },
};

export default meta;
type Story = StoryObj<typeof HelloRenderScope>;

/** Default rendering with all technique badges. */
export const Default: Story = {};

/** Custom title and tagline. */
export const CustomText: Story = {
  args: {
    title: "Custom Title",
    tagline: "Custom tagline for testing prop overrides",
  },
};

/** Demonstrates CSS variable theming override. */
export const CustomTheme: Story = {
  decorators: [
    (Story) => (
      <div
        style={{
          // Override CSS variables to prove theming works
          // @ts-expect-error CSS custom properties in inline style
          "--rs-bg-card": "#1a1a3e",
          "--rs-border": "#3b3b6e",
          "--rs-primary": "#e94560",
          "--rs-text": "#eaeaea",
          "--rs-text-muted": "#a0a0b0",
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates that consumers can override CSS custom properties to theme the component.",
      },
    },
  },
};

/** Shows the component on a light background. */
export const LightBackground: Story = {
  decorators: [
    (Story) => (
      <div
        style={{
          // @ts-expect-error CSS custom properties in inline style
          "--rs-bg-card": "#ffffff",
          "--rs-border": "#e0e0e0",
          "--rs-border-subtle": "#f0f0f0",
          "--rs-text": "#111111",
          "--rs-text-muted": "#666666",
          "--rs-text-dim": "#999999",
          "--rs-metric-good": "#16a34a",
          padding: "2rem",
          background: "#f5f5f5",
          borderRadius: 8,
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: { default: "light" },
    docs: {
      description: {
        story:
          "Shows that the component can be themed for light backgrounds by overriding CSS variables.",
      },
    },
  },
};
