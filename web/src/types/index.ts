export interface RendererMeta {
  id: string;
  name: string;
  technique: string[];
  language: string;
  license: string;
  status: "active" | "maintenance" | "archived" | "deprecated";
}
