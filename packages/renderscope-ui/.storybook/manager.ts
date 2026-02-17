import { addons } from "@storybook/manager-api";
import { create } from "@storybook/theming/create";

const renderScopeTheme = create({
  base: "dark",

  // Brand
  brandTitle: "RenderScope UI",
  brandUrl: "https://github.com/renderscope-dev/renderscope",
  brandTarget: "_blank",

  // Colors
  colorPrimary: "#3b82f6",
  colorSecondary: "#6366f1",

  // UI
  appBg: "#0d0d14",
  appContentBg: "#09090f",
  appPreviewBg: "#09090f",
  appBorderColor: "#262630",
  appBorderRadius: 6,

  // Text
  textColor: "#f2f2f2",
  textInverseColor: "#09090f",
  textMutedColor: "#87878f",

  // Toolbar
  barTextColor: "#87878f",
  barSelectedColor: "#3b82f6",
  barHoverColor: "#f2f2f2",
  barBg: "#121218",

  // Form
  inputBg: "#121218",
  inputBorder: "#262630",
  inputTextColor: "#f2f2f2",
  inputBorderRadius: 4,
});

addons.setConfig({
  theme: renderScopeTheme,
});
