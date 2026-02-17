import type { Preview } from "@storybook/react";
import "../src/styles/theme.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "renderscope-dark",
      values: [
        {
          name: "renderscope-dark",
          value: "#09090f",
        },
        {
          name: "renderscope-card",
          value: "#121218",
        },
        {
          name: "light",
          value: "#f5f5f5",
        },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
    viewport: {
      viewports: {
        mobile: {
          name: "Mobile",
          styles: { width: "375px", height: "667px" },
        },
        tablet: {
          name: "Tablet",
          styles: { width: "768px", height: "1024px" },
        },
        desktop: {
          name: "Desktop",
          styles: { width: "1440px", height: "900px" },
        },
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="renderscope">
        <Story />
      </div>
    ),
  ],
};

export default preview;
