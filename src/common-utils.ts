export function sanitizeLayerName(text: string): string {
  if (!text || text.length === 0) {
    return "untitled";
  }

  // remove liquid opening and closing braces first
  let cleanedTextLayerName = text.replace(/{{|}}/g, "");

  // remove all non-alphanumeric characters (except for spaces)
  cleanedTextLayerName = cleanedTextLayerName.replace(/[^a-zA-Z0-9 ]/g, "");

  // replace all spaces with underscores
  cleanedTextLayerName = cleanedTextLayerName.replace(/ /g, "_");

  return cleanedTextLayerName;
}

export function filenameify(text: string): string {
  if (!text || text.length === 0) {
    return "untitled";
  }

  let cleanedTextLayerName = text.replace(/\//g, "_");
  cleanedTextLayerName = text.replace(/[^a-zA-Z0-9\- ]/g, "");
  cleanedTextLayerName = cleanedTextLayerName.replace(/ /g, "_");

  return cleanedTextLayerName;
}

export interface ExportableBytes {
  name: string;
  bytes: Uint8Array;
}

export function toAssetURL(filename: string): string {
  return `asset://${filename}`;
}
