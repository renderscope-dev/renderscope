import type { Meta, StoryObj } from "@storybook/react";
import { RegionZoom } from "./RegionZoom";
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

const meta: Meta<typeof RegionZoom> = {
  title: "Image Comparison/RegionZoom",
  component: RegionZoom,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Region zoom comparison with a draggable selection box on an overview " +
          "image. Magnified panels show the selected region from each image at " +
          "the chosen zoom level. Supports keyboard navigation and zoom presets.",
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
type Story = StoryObj<typeof RegionZoom>;

/** Default 4x zoom with two images. Drag the selection box to explore. */
export const Default: Story = {
  args: {
    images: [imageA, imageB],
  },
};

/** 16x magnification reveals per-pixel differences. */
export const HighZoom: Story = {
  args: {
    images: [imageA, imageB],
    zoomLevel: 16,
  },
};

/** Smaller selection region (80px) for a tighter crop. */
export const SmallRegion: Story = {
  args: {
    images: [imageA, imageB],
    regionSize: 80,
  },
};

/** Three images with a 3-column magnified panel grid. */
export const ThreeImages: Story = {
  args: {
    images: [imageA, imageB, imageC],
  },
};
