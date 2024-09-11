import { EventHandler } from "@create-figma-plugin/utilities";
import { RawTemplateElement } from "./elements";
import { TemplateMetadata } from "./template";
import { TemplateElement } from "./element-types";

export interface ExportTemplateHandler extends EventHandler {
  name: "EXPORT_TEMPLATE";
  handler: (metadata: TemplateMetadata, elements: RawTemplateElement[]) => void;
}

export interface SetTemplateElementDataHandler extends EventHandler {
  name: "SET_TEMPLATE_ELEMENT_DATA";
  handler: (layerId: string, val: TemplateElement) => void;
}

export interface ElementSelectedHandler extends EventHandler {
  name: "ELEMENT_SELECTED";
  handler: (node: RawTemplateElement) => void;
}

export interface CloseHandler extends EventHandler {
  name: "CLOSE";
  handler: () => void;
}
