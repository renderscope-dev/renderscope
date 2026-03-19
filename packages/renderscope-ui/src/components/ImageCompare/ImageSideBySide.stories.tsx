import type { Meta, StoryObj } from "@storybook/react";
import { ImageSideBySide } from "./ImageSideBySide";
import {
  generateSampleImageA,
  generateSampleImageB,
  generateSampleImageC,
} from "./__stories__/sampleImages";

const imageA = {
  src: generateSampleImageA(),
  label: "PBRT v4",
};

const imageB = {
  src: generateSampleImageB(),
  label: "Mitsuba 3",
};

const imageC = {
  src: generateSampleImageC(),
  label: "Blender Cycles",
};

const meta: Meta<typeof ImageSideBySide> = {
  title: "Image Comparison/ImageSideBySide",
  component: ImageSideBySide,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Side-by-side image comparison with synchronized zoom and pan. " +
          "When the user zooms or pans one image, all others follow. " +
          "Supports horizontal/vertical layout and 2-4 images.",
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
type Story = StoryObj<typeof ImageSideBySide>;

/** Default horizontal layout with two images. Scroll to zoom, drag to pan. */
export const Default: Story = {
  args: {
    images: [imageA, imageB],
  },
};

/** Vertical stacking for tall-format comparisons. */
export const VerticalLayout: Story = {
  args: {
    images: [imageA, imageB],
    layout: "vertical",
  },
};

/** Three images side by side. */
export const ThreeImages: Story = {
  args: {
    images: [imageA, imageB, imageC],
  },
};

/** Zoom controls hidden for an embedded/minimal view. */
export const NoZoomControls: Story = {
  args: {
    images: [imageA, imageB],
    showZoomControls: false,
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
    images: [imageA, imageB],
  },
};
