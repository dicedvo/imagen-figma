import { convertRgbColorToHexColor } from "@create-figma-plugin/utilities";
import { filenameify, sanitizeLayerName, toAssetURL } from "./common-utils";
import { checkAndReturnCurrentNode, getRealPosition } from "./main-utils";
import { kebabCase } from "change-case";
import { mergeAndConcat } from "merge-anything";
import { TEMPLATE_ELEMENT_DATA_KEY, TemplateElement } from "./element-types";

export interface RawTemplateElement {
  name: string;
  figmaLayerType: NodeType;
  figmaLayerId: string;
  element: TemplateElement;
  children: RawTemplateElement[];
}

export function defaultTextLayerName(node: TextNode): string {
  if (!node.name) {
    return "Untitled";
  } else if (node.name !== node.characters) {
    return node.name;
  }
  return sanitizeLayerName(node.characters);
}

export function figmaNodeTypeToElementType(
  node: SceneNode,
): TemplateElement["type"] {
  switch (node.type) {
    case "TEXT":
      if (
        node.fontName === figma.mixed ||
        node.fontSize === figma.mixed ||
        node.fills === figma.mixed ||
        node.fills.length > 1
      ) {
        // Render text as an image if it's mixed-styled, mixed-sized, or mixed-colored
        return "image";
      }
      return "text";
    case "GROUP":
      return "raw_group";
    default:
      return "image";
  }
}

interface Asset {
  type: "font" | "image";
  name: string;
  data?: Uint8Array;
  options?: Record<string, any>;
}

class AssetList {
  assets: Record<string, Asset> = {};

  addAsset(asset: Asset) {
    if (this.assets[asset.name]) {
      this.assets[asset.name] = mergeAndConcat(this.assets, asset);
      return;
    }

    this.assets[asset.name] = asset;
  }
}

export function inferTemplateElement(
  node: SceneNode,
  assets: AssetList,
): TemplateElement {
  const existingData = node.getPluginData(TEMPLATE_ELEMENT_DATA_KEY);

  const {
    x: childX,
    y: childY,
    width: childW,
    height: childH,
  } = getRealPosition(
    node,
    node.parent?.children.findIndex((child) => child.id === node.id),
  );

  const element: TemplateElement = {
    type: figmaNodeTypeToElementType(node),
    exportable: node.visible,
    ...(existingData ? JSON.parse(existingData) : {}),
    ...{
      x: childX,
      y: childY,
      width: childW,
      height: childH,
    },
  };

  switch (element.type) {
    case "text":
      {
        const textNode = node as TextNode;
        if (textNode.fontName === figma.mixed) {
          throw new Error(
            "Mixed-styled texts are not yet supported. Please convert the text to a single style or separate them into different text layers.",
          );
        } else if (textNode.fontSize === figma.mixed) {
          throw new Error(
            "Mixed-sized texts are not yet supported. Please convert the text to a single size or separate them into different text layers.",
          );
        } else if (
          textNode.fills === figma.mixed ||
          textNode.fills.length > 1
        ) {
          throw new Error(
            "Mixed-colored texts are not yet supported. Please convert the text to a single color or separate them into different text layers.",
          );
        }

        // Text nodes will have inaccurate height and width
        // if using absoluteRenderBounds. Use the actual height and width
        element.width = textNode.width;
        element.height = textNode.height;
        element.x = textNode.x;
        element.y = textNode.y;

        element.value = textNode.characters;
        element.font_size = textNode.fontSize;
        element.font_family = textNode.fontName.family;
        element.font_style = textNode.fontName.style;
        element.font_weight =
          textNode.fontWeight !== figma.mixed ? textNode.fontWeight : 400;
        element.text_align = textNode.textAlignHorizontal.toLowerCase();
        element.vertical_align = textNode.textAlignVertical.toLowerCase();
        element.color = "#000000";

        if (textNode.fills.length === 1 && textNode.fills[0].type === "SOLID") {
          const converted = convertRgbColorToHexColor(textNode.fills[0].color);
          if (converted) {
            element.color = "#" + converted;
          }
        }

        if ("blendMode" in node && node.blendMode !== "NORMAL") {
          element.blend_mode = kebabCase(node.blendMode);
        }
      }
      break;
    case "image":
      // Default fallback type for all other types of layers
      {
        // Set asset path to the node id
        element.value = toAssetURL(
          encodeURIComponent(filenameify(node.id) + ".png"),
        );

        if ("blendMode" in node && node.blendMode !== "NORMAL") {
          element.blend_mode = kebabCase(node.blendMode);
        }
      }
      break;
    case "image_generator":
      // Default fallback type for all other types of layers
      {
        // Set asset path to the node id
        element.placeholder = toAssetURL(
          encodeURIComponent(filenameify(node.id) + ".png"),
        );

        if ("blendMode" in node && node.blendMode !== "NORMAL") {
          element.blend_mode = kebabCase(node.blendMode);
        }
      }
      break;
    case "raw_group":
      {
        const groupNode = node as GroupNode;
        const children: RawTemplateElement[] = [];

        for (let i = 0; i < groupNode.children.length; i++) {
          const child = groupNode.children[i];
          // if (child.x > groupNode.width || child.y > groupNode.height) {
          //   // Skip elements that are outside the bounds of the parent
          //   continue;
          // }

          const childElement = inferTemplateElement(child, assets);
          children.push({
            name:
              child.type === "TEXT" ? defaultTextLayerName(child) : child.name,
            figmaLayerId: child.id,
            figmaLayerType: child.type,
            element: childElement,
            children: [],
          });
        }

        element.children = children;
      }
      break;
  }

  return element;
}

export function getRawTemplateElements(node: FrameNode): RawTemplateElement[] {
  const elements: RawTemplateElement[] = [];
  const assetList = new AssetList();

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.x > node.width || child.y > node.height) {
      // Skip elements that are outside the bounds of the parent
      continue;
    }

    const element: RawTemplateElement = {
      name: child.type === "TEXT" ? defaultTextLayerName(child) : child.name,
      figmaLayerId: child.id,
      figmaLayerType: child.type,
      element: inferTemplateElement(child, assetList),
      children: [],
    };

    elements.push(element);
  }

  return elements;
}

export function getCurrentTemplateElements(): RawTemplateElement[] {
  const currentSelectedNode = checkAndReturnCurrentNode();
  if (!currentSelectedNode) {
    return [];
  }
  return getRawTemplateElements(currentSelectedNode);
}
