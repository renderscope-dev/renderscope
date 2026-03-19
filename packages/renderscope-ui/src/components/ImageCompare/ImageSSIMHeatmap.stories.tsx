import type { Meta, StoryObj } from "@storybook/react";
import { ImageSSIMHeatmap } from "./ImageSSIMHeatmap";
import {
  generateSampleImageA,
  generateSampleImageB,
} from "./__stories__/sampleImages";

const referenceUrl = generateSampleImageA();
const testUrl = generateSampleImageB();

const meta: Meta<typeof ImageSSIMHeatmap> = {
  title: "Image Comparison/ImageSSIMHeatmap",
  component: ImageSSIMHeatmap,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "SSIM (Structural Similarity Index) false-color heatmap. " +
          "Renders a per-block SSIM visualization using selectable colormaps " +
          "(viridis, inferno, magma) with a colorbar legend and global score.",
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
type Story = StoryObj<typeof ImageSSIMHeatmap>;

/** Default viridis colormap with score and colorbar. */
export const Default: Story = {
  args: {
    reference: referenceUrl,
    test: testUrl,
    colorMap: "viridis",
  },
};

/** Inferno colormap -- high-contrast warm palette. */
export const InfernoColormap: Story = {
  args: {
    reference: referenceUrl,
    test: testUrl,
    colorMap: "inferno",
  },
};

/** Magma colormap -- purple-to-yellow palette. */
export const MagmaColormap: Story = {
  args: {
    reference: referenceUrl,
    test: testUrl,
    colorMap: "magma",
  },
};

/** Global SSIM score hidden. */
export const NoScore: Story = {
  args: {
    reference: referenceUrl,
    test: testUrl,
    showScore: false,
  },
};

/** Colorbar legend hidden for a minimal view. */
export const NoColorbar: Story = {
  args: {
    reference: referenceUrl,
    test: testUrl,
    showColorbar: false,
  },
};
