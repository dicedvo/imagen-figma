import { ExportableBytes, filenameify, toAssetURL } from "./common-utils";
import { RawTemplateElement } from "./elements";
import { TEMPLATE_FORMAT_VERSION, TemplateMetadata } from "./template";

async function exportAssets(
  exportables: ExportableBytes[],
  elements: RawTemplateElement[],
) {
  for (const { figmaLayerId, element } of elements) {
    if (!element.exportable) {
      continue;
    }

    if (element.type === "image" || element.type === "image_generator") {
      if (element.type === "image_generator" && !element.placeholder) {
        continue;
      }

      const imageLayer = figma.currentPage.findOne(
        (node) => node.id === figmaLayerId,
      );
      if (!imageLayer) {
        continue;
      }

      // export image
      const image = await imageLayer.exportAsync({ format: "PNG" });
      exportables.push({
        name: `assets/${filenameify(figmaLayerId)}.png`,
        bytes: image,
      });
    } else if (element.type === "raw_group") {
      await exportAssets(exportables, element.children);
    }
  }
}

export async function exportTemplate(
  template: TemplateMetadata,
  elements: RawTemplateElement[],
): Promise<[string, ExportableBytes[]]> {
  const exportables: ExportableBytes[] = [];
  const encoder = new TextEncoder();
  let bgAssetName = "";

  if (elements.length !== 0) {
    // export background image
    const firstLayerInFrame = figma.currentPage.findOne(
      (l) => l.id === elements[0].figmaLayerId,
    );
    if (
      firstLayerInFrame &&
      firstLayerInFrame.parent?.type === "FRAME" &&
      firstLayerInFrame.parent?.name === template.name
    ) {
      const parent = firstLayerInFrame.parent;
      if (Array.isArray(parent.fills) || parent.fills === figma.mixed) {
        const hiddenAlready: Record<string, boolean> = {};

        // hide the children first
        for (const child of parent.children) {
          if (!child.visible) {
            hiddenAlready[child.id] = true;
            continue;
          }
          child.visible = false;
        }

        // export the bg
        bgAssetName = "bg.png";

        const image = await parent.exportAsync({ format: "PNG" });
        exportables.push({
          name: `assets/${bgAssetName}`,
          bytes: image,
        });

        // show again
        for (const child of parent.children) {
          if (hiddenAlready[child.id]) {
            continue;
          }
          child.visible = true;
        }
      }
    }
  }

  exportables.push({
    name: "template.json",
    bytes: encoder.encode(
      JSON.stringify(
        {
          ...template,
          settings: {
            ...template.settings,
            canvas_background_image: toAssetURL(bgAssetName),
          },
          $version: TEMPLATE_FORMAT_VERSION,
          elements: elements
            .filter((el) => el.element.exportable)
            .map((rawElement) => {
              if (rawElement.element.type === "raw_group") {
                return {
                  ...rawElement.element,
                  type: "group",
                  name: rawElement.name,
                  children: rawElement.element.children.map((child) => ({
                    ...child.element,
                    name: child.name,
                  })),
                };
              }
              return {
                ...rawElement.element,
                name: rawElement.name,
              };
            }),
        },
        null,
        2,
      ),
    ),
  });

  await exportAssets(exportables, elements);

  const filename = `${filenameify(template.name)}.dicetemplate`;
  figma.notify(`Saved as ${filename}`);
  return [filename, exportables];
}
