import type { Meta, StoryObj } from "@storybook/react";
import { TaxonomyGraph } from "./TaxonomyGraph";
import {
  sampleTaxonomyData,
  minimalTaxonomyData,
  denseTaxonomyData,
  languageColorData,
} from "./sample-data";

const meta: Meta<typeof TaxonomyGraph> = {
  title: "Components/TaxonomyGraph",
  component: TaxonomyGraph,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Interactive D3 force-directed taxonomy graph for visualizing relationships between rendering engines. " +
          "Supports zoom, pan, hover tooltips, node clicking, dragging, and multiple color-coding modes.",
      },
    },
  },
  argTypes: {
    data: { control: false },
    interactive: { control: "boolean" },
    showLegend: { control: "boolean" },
    showControls: { control: "boolean" },
    showTooltip: { control: "boolean" },
    colorBy: {
      control: "select",
      options: ["technique", "language", "status"],
    },
    minHeight: { control: { type: "range", min: 200, max: 1000, step: 50 } },
    highlightedNodes: { control: false },
    colorMap: { control: false },
    onNodeClick: { action: "nodeClicked" },
    renderTooltip: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TaxonomyGraph>;

/**
 * Full interactive graph with sample data. All defaults active.
 * This is the "hero" story demonstrating the core capability.
 *
 * Try: hover nodes, drag them, zoom with scroll wheel,
 * click renderer nodes, double-click background to fit-to-view.
 */
export const Default: Story = {
  args: {
    data: sampleTaxonomyData,
  },
};

/**
 * Color nodes by programming language instead of rendering technique.
 * Uses a custom `colorMap` to assign distinct colors per language.
 * Demonstrates that the component is flexible beyond technique-based coloring.
 */
export const CustomColors: Story = {
  args: {
    data: languageColorData,
    colorBy: "language",
    colorMap: {
      "C++": "#F34B7D",
      Python: "#3572A5",
      Rust: "#DEA584",
      JavaScript: "#F1E05A",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Color nodes by programming language instead of rendering technique. " +
          "Pass `colorBy='language'` and a custom `colorMap` to assign colors.",
      },
    },
  },
};

/**
 * Several nodes highlighted via the `highlightedNodes` prop.
 * Highlighted nodes get a pulsing ring and always-visible labels.
 * Useful for search results or user selections.
 */
export const HighlightedNodes: Story = {
  args: {
    data: sampleTaxonomyData,
    highlightedNodes: ["pbrt", "mitsuba3", "instant-ngp"],
  },
  parameters: {
    docs: {
      description: {
        story:
          "Nodes in the `highlightedNodes` array get a pulsing ring animation and brighter appearance. " +
          "Useful for drawing attention to search results or user selections.",
      },
    },
  },
};

/**
 * Static (non-interactive) render mode.
 * The simulation runs to settle, then all interactions are disabled.
 * Useful for thumbnails, reports, or print contexts.
 */
export const NonInteractive: Story = {
  args: {
    data: sampleTaxonomyData,
    interactive: false,
    showControls: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Set `interactive={false}` to disable zoom, pan, drag, and hover. " +
          "The simulation still runs on mount to compute the layout, then freezes.",
      },
    },
  },
};

/**
 * Only 4 nodes and 3 edges. Proves the component handles
 * sparse data gracefully without nodes flying to edges.
 */
export const MinimalData: Story = {
  args: {
    data: minimalTaxonomyData,
    minHeight: 400,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Minimal data set with just 4 nodes and 3 edges. " +
          "Verifies the component handles sparse data gracefully.",
      },
    },
  },
};

/**
 * 40+ nodes and 80+ edges. Stress test for performance and readability.
 * Should render and animate at 60fps on any modern device.
 */
export const DenseData: Story = {
  args: {
    data: denseTaxonomyData,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Dense graph with 40+ nodes and 80+ edges. " +
          "Performance stress test — should maintain 60fps on modern hardware.",
      },
    },
  },
};

/**
 * Uses the `renderTooltip` prop to provide completely custom tooltip content.
 * The built-in tooltip is replaced with a custom rendering function.
 */
export const CustomTooltip: Story = {
  args: {
    data: sampleTaxonomyData,
    renderTooltip: (node) => (
      <div style={{ padding: "4px 0" }}>
        <strong style={{ color: "var(--rs-text, #f2f2f2)", fontSize: 14 }}>
          {node.label}
        </strong>
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "var(--rs-text-muted, #87878f)",
          }}
        >
          Type: {node.type}
        </div>
        {node.technique && (
          <div
            style={{
              marginTop: 2,
              fontSize: 12,
              color: "var(--rs-text-muted, #87878f)",
            }}
          >
            Technique: {node.technique}
          </div>
        )}
        {node.stars != null && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: "#eab308",
              fontWeight: 600,
            }}
          >
            {node.stars.toLocaleString()} stars
          </div>
        )}
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Pass a `renderTooltip` function to completely customize tooltip content. " +
          "Receives the hovered `TaxonomyNode` and returns React elements.",
      },
    },
  },
};

/**
 * Legend overlay hidden with `showLegend={false}`.
 * Demonstrates removing the legend when it's not needed.
 */
export const NoLegend: Story = {
  args: {
    data: sampleTaxonomyData,
    showLegend: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Set `showLegend={false}` to remove the color legend overlay.",
      },
    },
  },
};

/**
 * Compact layout with `minHeight={300}`.
 * Shows the component at a shorter height for dashboard or card contexts.
 */
export const CustomMinHeight: Story = {
  args: {
    data: sampleTaxonomyData,
    minHeight: 300,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Set `minHeight={300}` for compact layouts. " +
          "The graph auto-fits to the available space.",
      },
    },
  },
};
