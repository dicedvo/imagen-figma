export function checkAndReturnCurrentNode() {
  if (figma.currentPage.selection.length !== 0) {
    let currentSelectedNode = figma.currentPage.selection[0];
    while (currentSelectedNode) {
      if (currentSelectedNode.type === "FRAME") {
        return currentSelectedNode;
      }

      if (!("parent" in currentSelectedNode) || !currentSelectedNode.parent) {
        break;
      }

      //@ts-expect-error - TS doesn't know that parent is a SceneNode
      currentSelectedNode = currentSelectedNode.parent;
    }
  }
  return null;
}

export function getRealPosition(node: SceneNode, childIndex?: number): Rect {
  let x = node.x;
  let y = node.y;
  let h = node.height;
  let w = node.width;

  if ("absoluteRenderBounds" in node && node.absoluteRenderBounds) {
    h = node.absoluteRenderBounds.height;
    w = node.absoluteRenderBounds.width;
    x = node.absoluteRenderBounds.x;
    y = node.absoluteRenderBounds.y;

    // calculate relative x and y based on absolute x and childY and parent's absoluteRenderBounds
    if (
      node.parent &&
      "absoluteRenderBounds" in node.parent &&
      node.parent.absoluteRenderBounds
    ) {
      x -= node.parent.absoluteRenderBounds.x;
      y -= node.parent.absoluteRenderBounds.y;
    }
  }

  if (node.parent && (x < 0 || y < 0)) {
    if ("rotation" in node && node.rotation) {
      const index = childIndex ?? node.parent.children.indexOf(node);
      const group = figma.group([node], node.parent, index);

      x = group.x;
      y = group.y;
      w = group.width;
      h = group.height;

      if (group.absoluteRenderBounds) {
        x = group.absoluteRenderBounds.x;
        y = group.absoluteRenderBounds.y;
        w = group.absoluteRenderBounds.width;
        h = group.absoluteRenderBounds.height;
      }

      node.parent.insertChild(index, node);
    }

    const clippedXMin = Math.max(0, x);
    const clippedYMin = Math.max(0, y);
    const clippedXMax = Math.min(
      "width" in node.parent ? node.parent.width : 0,
      x + w,
    );
    const clippedYMax = Math.min(
      "height" in node.parent ? node.parent.height : 0,
      y + h,
    );
    const clippedWidth = Math.max(0, clippedXMax - clippedXMin);
    const clippedHeight = Math.max(0, clippedYMax - clippedYMin);

    return {
      x: clippedXMin,
      y: clippedYMin,
      width: clippedWidth,
      height: clippedHeight,
    };
  }

  return {
    x,
    y,
    width: w,
    height: h,
  };
}
