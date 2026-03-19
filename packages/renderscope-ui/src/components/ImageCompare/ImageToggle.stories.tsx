import type { Meta, StoryObj } from "@storybook/react";
import { ImageToggle } from "./ImageToggle";
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

const meta: Meta<typeof ImageToggle> = {
  title: "Image Comparison/ImageToggle",
  component: ImageToggle,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Multi-image toggle with click-to-advance, keyboard navigation, " +
          "and auto-play with configurable speed. Images crossfade with " +
          "adjustable transition duration.",
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
type Story = StoryObj<typeof ImageToggle>;

/** Default two-image toggle. Click the viewport or use arrow keys. */
export const Default: Story = {
  args: {
    images: [imageA, imageB],
  },
};

/** Three images with dot navigation. */
export const ThreeImages: Story = {
  args: {
    images: [imageA, imageB, imageC],
  },
};

/** Auto-play enabled with 1.5s interval. Press space to pause. */
export const AutoPlay: Story = {
  args: {
    images: [imageA, imageB, imageC],
    interval: 1500,
  },
};

/** Label overlay hidden for a cleaner look. */
export const NoLabel: Story = {
  args: {
    images: [imageA, imageB],
    showLabel: false,
  },
};

/** Fast 100ms transition for a snappier toggle feel. */
export const FastTransition: Story = {
  args: {
    images: [imageA, imageB],
    transitionDuration: 100,
  },
};
