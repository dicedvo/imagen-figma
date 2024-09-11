import {
  emit,
  getSceneNodeById,
  once,
  on,
  showUI,
} from "@create-figma-plugin/utilities";

import {
  CloseHandler,
  ElementSelectedHandler,
  ExportTemplateHandler,
  SetTemplateElementDataHandler,
} from "./events";
import { getTemplateMetadata } from "./template";
import { getCurrentTemplateElements } from "./elements";
import { TEMPLATE_ELEMENT_DATA_KEY } from "./element-types";
import { exportTemplate } from "./export";

export default function () {
  once<ExportTemplateHandler>("EXPORT_TEMPLATE", (metadata, elements) => {
    exportTemplate(metadata, elements).then((payload) => {
      emit("EXPORTED_TEMPLATE", ...payload);
    });
  });

  once<CloseHandler>("CLOSE", function () {
    figma.closePlugin();
  });

  on<ElementSelectedHandler>("ELEMENT_SELECTED", function (element) {
    console.log("Element selected:", element);
    if (
      element.figmaLayerType === "FRAME" ||
      (figma.currentPage.selection.length !== 0 &&
        element.figmaLayerId === figma.currentPage.selection[0].id)
    ) {
      // Skip selecting the frame or if the element is already selected
      return;
    }

    try {
      const node = getSceneNodeById(element.figmaLayerId);
      figma.currentPage.selection = [node];
    } catch (e) {
      console.error(e);
    }
  });

  on<SetTemplateElementDataHandler>(
    "SET_TEMPLATE_ELEMENT_DATA",
    function (layerId, element) {
      const node = getSceneNodeById(layerId);
      node.setPluginData(TEMPLATE_ELEMENT_DATA_KEY, JSON.stringify(element));
    },
  );

  figma.on("selectionchange", () => {
    emit(
      "SELECTION_CHANGED",
      figma.currentPage.selection.map((node) => node.id),
    );
    emit("STATE_CHANGED", getCurrentTemplateElements(), getTemplateMetadata());
  });

  showUI(
    {
      height: 700,
      width: 350,
      position: {
        x: 580,
        y: -1050,
      },
    },
    {
      initialMetadata: getTemplateMetadata(),
      initialElements: getCurrentTemplateElements(),
    },
  );
}
