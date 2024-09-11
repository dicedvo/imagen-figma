import { checkAndReturnCurrentNode } from "./main-utils";
import { TemplateElement } from "./element-types";

export const TEMPLATE_FORMAT_VERSION = "1.0.0" as const;

export type CompiledTemplate = TemplateMetadata & {
  elements: TemplateElement[];
};

export interface TemplateMetadata {
  $version: typeof TEMPLATE_FORMAT_VERSION;
  name: string;
  settings: {
    canvas_width: number;
    canvas_height: number;
  };
}

export function getTemplateMetadata(): TemplateMetadata | null {
  const currentNode = checkAndReturnCurrentNode();
  if (!currentNode) {
    return null;
  }

  let width = currentNode.width;
  let height = currentNode.height;

  if (currentNode.absoluteRenderBounds) {
    width = currentNode.absoluteRenderBounds.width;
    height = currentNode.absoluteRenderBounds.height;
  }

  return {
    $version: TEMPLATE_FORMAT_VERSION,
    name: currentNode.name,
    settings: {
      canvas_width: width,
      canvas_height: height,
    },
  };
}
