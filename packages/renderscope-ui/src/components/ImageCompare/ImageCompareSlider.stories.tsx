import type { Meta, StoryObj } from "@storybook/react";
import { ImageCompareSlider } from "./ImageCompareSlider";
import {
  generateSampleImageA,
  generateSampleImageB,
} from "./__stories__/sampleImages";

const sampleLeft = {
  src: generateSampleImageA(),
  label: "PBRT v4",
  metadata: { "Render Time": "12.4s", Samples: "1024" },
};

const sampleRight = {
  src: generateSampleImageB(),
  label: "Mitsuba 3",
  metadata: { "Render Time": "8.7s", Samples: "512" },
};

const meta: Meta<typeof ImageCompareSlider> = {
  title: "Image Comparison/ImageCompareSlider",
  component: ImageCompareSlider,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A draggable before/after slider for comparing two images. " +
          "Supports horizontal and vertical orientations, labels, and metadata overlays.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 800 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ImageCompareSlider>;

/** Default horizontal slider at 50% position. */
export const Default: Story = {
  args: {
    left: sampleLeft,
    right: sampleRight,
  },
};

/** Vertical orientation divides images top/bottom. */
export const VerticalOrientation: Story = {
  args: {
    left: sampleLeft,
    right: sampleRight,
    orientation: "vertical",
  },
};

/** Hover over the image to reveal metadata overlays. */
export const WithMetadata: Story = {
  args: {
    left: sampleLeft,
    right: sampleRight,
    showMetadata: true,
  },
};

/** Labels hidden for a cleaner look. */
export const NoLabels: Story = {
  args: {
    left: sampleLeft,
    right: sampleRight,
    showLabels: false,
  },
};

/** Initial slider position at 25%. */
export const CustomPosition: Story = {
  args: {
    left: sampleLeft,
    right: sampleRight,
    initialPosition: 0.25,
  },
};

/** Demonstrates CSS variable overrides for custom theming. */
export const CustomTheme: Story = {
  decorators: [
    (Story) => (
      <div
        style={
          {
            "--rs-primary": "#e94560",
            "--rs-bg-card": "#1a1a2e",
            "--rs-border": "#3b3b6e",
          } as React.CSSProperties
        }
      >
        <Story />
      </div>
    ),
  ],
  args: {
    left: sampleLeft,
    right: sampleRight,
  },
};
