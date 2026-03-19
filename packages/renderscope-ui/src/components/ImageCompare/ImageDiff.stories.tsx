import type { Meta, StoryObj } from "@storybook/react";
import { ImageDiff } from "./ImageDiff";
import {
  generateSampleImageA,
  generateSampleImageB,
} from "./__stories__/sampleImages";

const referenceUrl = generateSampleImageA();
const testUrl = generateSampleImageB();

const meta: Meta<typeof ImageDiff> = {
  title: "Image Comparison/ImageDiff",
  component: ImageDiff,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Pixel-level difference visualization between two images. " +
          "Supports absolute RGB and luminance difference modes with " +
          "adjustable amplification, and computes PSNR/SSIM quality metrics.",
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
type Story = StoryObj<typeof ImageDiff>;

/** Default absolute difference mode with 5x amplification. */
export const Default: Story = {
  args: {
    reference: referenceUrl,
    test: testUrl,
    mode: "absolute",
  },
};

/** Luminance-only difference highlights structural changes. */
export const LuminanceMode: Story = {
  args: {
    reference: referenceUrl,
    test: testUrl,
    mode: "luminance",
  },
};

/** 20x amplification reveals subtle differences. */
export const HighAmplification: Story = {
  args: {
    reference: referenceUrl,
    test: testUrl,
    mode: "absolute",
    amplification: 20,
  },
};

/** Metrics overlay hidden for a clean visualization. */
export const NoMetrics: Story = {
  args: {
    reference: referenceUrl,
    test: testUrl,
    showMetrics: false,
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
    reference: referenceUrl,
    test: testUrl,
  },
};
