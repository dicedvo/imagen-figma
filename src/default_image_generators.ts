interface ImageGenerator {
  id: string;
  name: string;
  onGenerateDefaultConfig: () => Record<string, unknown>;
}

const defaultImageGenerators: ImageGenerator[] = [
  {
    id: "qr_code",
    name: "QR Code",
    onGenerateDefaultConfig: () => ({
      text: "",
    }),
  },
  {
    id: "dynamic_image",
    name: "Dynamic Image",
    onGenerateDefaultConfig: () => ({
      src: "",
      fallback: "",
    }),
  },
];

export default defaultImageGenerators;
