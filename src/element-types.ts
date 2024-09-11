// This is copied from the imagen repo (src/core/template/types.ts).
// If you have any changes to make, please make them there.
import { RawTemplateElement } from "./elements";

export const TEMPLATE_ELEMENT_DATA_KEY = "__dice_template_element_data";

export type TemplateElement =
  | TextTemplateElement
  | ImageTemplateElement
  | ImageGeneratorTemplateElement
  | GroupedTemplateElement
  | RawGroupedTemplateElement;

export type BaseTemplateElement = {
  id?: string;
  type: string;
  exportable?: boolean;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextTemplateElement = BaseTemplateElement & {
  type: "text";
  value: string;
  font_size: number;
  font_family: string;
  font_style: string;
  font_weight: number;
  text_align: string;
  vertical_align: string;
  color: string;
  blend_mode?: string;
};

export type ImageTemplateElement = BaseTemplateElement & {
  type: "image";
  value: string;
  blend_mode?: string;
};

export type ImageGeneratorTemplateElement = BaseTemplateElement & {
  type: "image_generator";
  value: Record<string, unknown>;
  generator: string;
  placeholder?: string;
  blend_mode?: string;
};

export type GroupedTemplateElement = BaseTemplateElement & {
  type: "group";
  value: never;
  children: TemplateElement[];
};

// This should be transformed into GroupedTemplateElement upon export
export type RawGroupedTemplateElement = BaseTemplateElement & {
  type: "raw_group";
  value: never;
  children: RawTemplateElement[];
};
