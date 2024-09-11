import {
  Button,
  Columns,
  Container,
  Dropdown,
  IconLayerFrame16,
  IconLayerImage16,
  IconLayerText16,
  Layer,
  MiddleAlign,
  Muted,
  render,
  Stack,
  Tabs,
  Text,
  Textbox,
  Toggle,
  VerticalSpace,
} from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
import { Fragment, h } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";

import { CloseHandler, ExportTemplateHandler } from "./events";
import { RawTemplateElement } from "./elements";
import { TemplateMetadata } from "./template";
import { ExportableBytes } from "./common-utils";
import JSZip from "jszip";
import { produce } from "immer";
import {
  ImageGeneratorTemplateElement,
  ImageTemplateElement,
  RawGroupedTemplateElement,
  TemplateElement,
  TextTemplateElement,
} from "./element-types";
import defaultImageGenerators from "./default_image_generators";

type ElementOnUpdate<T extends TemplateElement = TemplateElement> = (
  u: (element: T) => void,
) => void;

interface TemplateElementSettingsProps<
  T extends TemplateElement = TemplateElement,
> {
  element: T;
  onUpdate: ElementOnUpdate<T>;
}

function useElementSelection(elements: RawTemplateElement[]) {
  const [currentId, setCurrentId] = useState<string | null>(null);
  // const [shouldTriggerElementChange, setShouldTriggerElementChange] =
  //   useState(true);

  const currentElement = useMemo(() => {
    if (currentId === null) {
      return null;
    }
    return findElementById(elements, currentId);
  }, [currentId, elements]);

  const handleSelectionChanged = useCallback(
    (selectedIds: string[]) => {
      if (selectedIds.length === 0) {
        setCurrentId(null);
        return;
      }

      let activeId = selectedIds[0];

      const foundElement = elements.find((el) => el.figmaLayerId === activeId);
      if (!foundElement) {
        // Find nearest raw_group element instead
        const rawGroupEls = elements.filter(
          (el) => el.element.type === "raw_group",
        );

        for (const el of rawGroupEls) {
          if (el.element.type != "raw_group") continue; // for type promotion reasons

          if (
            el.element.children.findIndex(
              (c) => c.figmaLayerId === activeId,
            ) !== -1
          ) {
            activeId = el.figmaLayerId;
            // setShouldTriggerElementChange(false);
            break;
          }
        }

        if (activeId === selectedIds[0]) {
          return;
        }
      }

      setCurrentId(activeId);
    },
    [elements],
  );

  // useEffect(() => {
  //   if (currentElement && shouldTriggerElementChange) {
  //     emit<ElementSelectedHandler>("ELEMENT_SELECTED", currentElement);
  //   }

  //   return () => {
  //     setShouldTriggerElementChange(true);
  //   };
  // }, [currentElement, shouldTriggerElementChange]);

  useEffect(() => {
    const unsubSelectionChanged = on(
      "SELECTION_CHANGED",
      handleSelectionChanged,
    );

    return () => {
      unsubSelectionChanged();
    };
  }, []);

  return {
    currentId,
    setCurrentId,
    currentElement,
  };
}

function ImageGeneratorTemplateElementSettings({
  element,
  onUpdate,
}: TemplateElementSettingsProps<ImageGeneratorTemplateElement>) {
  const values = useMemo(() => {
    if (element.value && typeof element.value == "object") {
      return element.value;
    }
    return (
      defaultImageGenerators
        .find((gen) => gen.id === element.generator)
        ?.onGenerateDefaultConfig() ?? {}
    );
  }, [element.generator, element.value]);

  return (
    <Fragment>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          paddingBottom: "0.5rem",
        }}
      >
        <div
          style={{
            width: "50%",
            height: "100%",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Text>Generator</Text>
        </div>

        <div style={{ width: "50%" }}>
          <Dropdown
            onValueChange={(v) => {
              onUpdate((prev) => {
                if (prev.type !== "image_generator") {
                  return;
                }
                prev.generator = v ?? prev.generator;
              });
            }}
            options={[
              "-",
              ...defaultImageGenerators.map((gen) => ({
                value: gen.id,
                text: gen.name,
              })),
            ]}
            placeholder="Select"
            value={element.generator ?? null}
            variant="border"
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {element.generator && (
        <Fragment>
          {Object.entries(values).map(([name, value]) => (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                paddingBottom: "0.5rem",
              }}
            >
              <div
                style={{
                  width: "50%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Text>{name}</Text>
              </div>

              <div style={{ width: "50%" }}>
                <Textbox
                  value={(value as string) ?? ""}
                  onValueInput={(v) => {
                    onUpdate((prev) => {
                      prev.value = {
                        ...values,
                        [name]: v,
                      };
                    });
                  }}
                  variant="border"
                />
              </div>
            </div>
          ))}
        </Fragment>
      )}
    </Fragment>
  );
}

function ImageTemplateElementSettings({
  element,
  onUpdate,
}: TemplateElementSettingsProps<
  ImageTemplateElement | ImageGeneratorTemplateElement
>) {
  // create an image template element setting that will
  // - check if the element is an image generator
  //   - if yes, show and select the image generator to be used

  return (
    <Container space="medium">
      <VerticalSpace space="small" />
      <Stack space="medium">
        <Columns space="extraSmall">
          <Toggle
            onValueChange={(enabled) =>
              onUpdate((prev) => {
                prev.type = enabled ? "image_generator" : "image";
              })
            }
            value={element.type === "image_generator"}
          >
            <Text>Mark as an image generator</Text>
          </Toggle>
        </Columns>

        {element.type == "image_generator" && (
          <ImageGeneratorTemplateElementSettings
            element={element}
            onUpdate={
              onUpdate as ElementOnUpdate<ImageGeneratorTemplateElement>
            }
          />
        )}
      </Stack>
    </Container>
  );
}

function RawGroupTemplateElementSettings({
  element,
  onUpdate,
}: TemplateElementSettingsProps<RawGroupedTemplateElement>) {
  const { currentId, setCurrentId, currentElement } = useElementSelection(
    element.children,
  );
  const onUpdateTemplateElements: ElementOnUpdate<TemplateElement> =
    useCallback(
      (cb) => {
        onUpdate((groupEl) => {
          if (currentId === null) {
            return;
          }

          const element = findElementById(groupEl.children, currentId);
          if (!element) {
            return;
          }

          cb(element.element);

          emit("SET_TEMPLATE_ELEMENT_DATA", element.figmaLayerId, {
            ...element.element,
          });
        });
      },
      [currentId],
    );

  return (
    <div>
      {currentElement && (
        <div
          style={{
            borderBottom: `1px solid var(--figma-color-border)`,
            paddingBottom: `1.1rem`,
          }}
        >
          <TemplateElementSettings
            element={currentElement.element}
            onUpdate={onUpdateTemplateElements}
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: element.children.length === 0 ? "150px" : "auto",
          paddingTop: "1.1rem",
        }}
      >
        <Container space="medium">
          <Text>
            <Muted>
              "
              {element.name
                ? element.name.length < 10
                  ? element.name
                  : element.name.substring(0, 10) + "..."
                : "<unknown element>"}
              " elements
            </Muted>
          </Text>
          <VerticalSpace space="small" />
        </Container>
        {element.children.length === 0 ? (
          <MiddleAlign style={{ flex: 1 }}>
            <Muted>No elements found</Muted>
          </MiddleAlign>
        ) : (
          <ElementsList
            elements={element.children}
            currentId={currentId}
            onElementClick={(id) => setCurrentId(id)}
          />
        )}
      </div>
    </div>
  );
}

function TextTemplateElementSettings({
  element,
  onUpdate,
}: TemplateElementSettingsProps<TextTemplateElement>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
      <div>Font Name</div>
      <div></div>
    </div>
  );
}

function TemplateElementSettings({
  element,
  onUpdate,
}: TemplateElementSettingsProps) {
  switch (element.type) {
    case "image":
    case "image_generator":
      return (
        <ImageTemplateElementSettings
          element={element}
          onUpdate={
            onUpdate as ElementOnUpdate<
              ImageTemplateElement | ImageGeneratorTemplateElement
            >
          }
        />
      );
    case "raw_group":
      return (
        <RawGroupTemplateElementSettings
          element={element}
          onUpdate={onUpdate as ElementOnUpdate<RawGroupedTemplateElement>}
        />
      );
    case "text":
      return (
        <TextTemplateElementSettings
          element={element}
          onUpdate={onUpdate as ElementOnUpdate<TextTemplateElement>}
        />
      );
    default:
      return (
        <div
          style={{
            height: "4rem",
            display: "flex",
            textAlign: "center",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Muted>No settings found for "{element.type}" type.</Muted>
        </div>
      );
  }
}

function TemplateMetadataSettings({
  metadata,
  onUpdate,
}: {
  metadata: TemplateMetadata;
  onUpdate: (u: (metadata: TemplateMetadata) => void) => void;
}) {
  return (
    <Container space="medium">
      <VerticalSpace space="medium" />
      <Stack space="small">
        <Text>Name</Text>
        <Textbox
          value={metadata.name}
          onValueInput={(v) => {
            onUpdate((prev) => {
              prev.name = v;
            });
          }}
          variant="border"
        />
      </Stack>
    </Container>
  );
}

function ElementsList({
  elements,
  currentId,
  onElementClick,
}: {
  elements: RawTemplateElement[];
  currentId: string | null;
  onElementClick: (id: string) => void;
}) {
  return (
    <div>
      {elements.map(function (rawElement, idx) {
        return (
          <Layer
            key={`element_${idx}`}
            description={rawElement.element.type}
            icon={
              rawElement.element.type === "text" ? (
                <IconLayerText16 />
              ) : rawElement.element.type === "image" ? (
                <IconLayerImage16 />
              ) : (
                <IconLayerFrame16 />
              )
            }
            onChange={() => onElementClick(rawElement.figmaLayerId)}
            value={currentId === rawElement.figmaLayerId}
          >
            {rawElement.name}
          </Layer>
        );
      })}
    </div>
  );
}

function findElementById(
  elements: RawTemplateElement[],
  id: string,
): RawTemplateElement | null {
  for (const element of elements) {
    if (element.figmaLayerId === id) {
      return element;
    }

    if (element.element.type === "raw_group") {
      const found = findElementById(element.element.children, id);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function Plugin({
  initialMetadata,
  initialElements,
}: {
  initialMetadata: TemplateMetadata;
  initialElements: RawTemplateElement[];
}) {
  const [elements, setElements] =
    useState<RawTemplateElement[]>(initialElements);
  const [templateMetadata, setTemplateMetadata] =
    useState<TemplateMetadata | null>(initialMetadata);
  const [currentTab, setCurrentTab] = useState<"Template" | "Element">(
    "Template",
  );
  const { currentId, setCurrentId, currentElement } =
    useElementSelection(elements);

  const handleExportClick = useCallback(
    function () {
      if (!templateMetadata) {
        return;
      }
      emit<ExportTemplateHandler>(
        "EXPORT_TEMPLATE",
        templateMetadata,
        elements,
      );
    },
    [templateMetadata, elements],
  );

  const handleCloseButtonClick = useCallback(function () {
    emit<CloseHandler>("CLOSE");
  }, []);

  const handleExportedTemplate = useCallback(function (
    filename: string,
    exportables: ExportableBytes[],
  ) {
    const zip = new JSZip();
    for (const exportable of exportables) {
      zip.file(exportable.name, exportable.bytes);
    }

    zip.generateAsync({ type: "blob" }).then((blob) => {
      const url = URL.createObjectURL(blob);

      // Download the $url as a file named $filename
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
    });
  }, []);

  const handleStateChanged = useCallback(function (
    elements: RawTemplateElement[],
    templateMetadata: TemplateMetadata,
  ) {
    setElements(elements);
    setTemplateMetadata(templateMetadata);
  }, []);

  const onUpdateTemplateElements: ElementOnUpdate<TemplateElement> =
    useCallback(
      (cb) => {
        setElements((old) => {
          if (currentId === null) {
            return old;
          }

          const newElements = produce(old, (draft) => {
            const element = findElementById(draft, currentId);
            if (!element) {
              return;
            }

            cb(element.element);
          });

          const element = findElementById(newElements, currentId);
          if (element) {
            emit(
              "SET_TEMPLATE_ELEMENT_DATA",
              element.figmaLayerId,
              element.element,
            );
          }

          return newElements;
        });
      },
      [currentId],
    );

  useEffect(function () {
    const unsubExportedTemplate = on(
      "EXPORTED_TEMPLATE",
      handleExportedTemplate,
    );
    const unsubStateChanged = on("STATE_CHANGED", handleStateChanged);

    return function () {
      unsubExportedTemplate();
      unsubStateChanged();
    };
  }, []);

  useEffect(
    function () {
      if (currentId === null) {
        setCurrentTab("Template");
        return;
      }

      setCurrentTab("Element");
    },
    [currentId, elements],
  );

  if (!templateMetadata) {
    return (
      <MiddleAlign>
        <Muted>Please select a frame layer first.</Muted>
      </MiddleAlign>
    );
  }

  return (
    <div>
      <Tabs
        onValueChange={(s) => setCurrentTab(s as "Template" | "Element")}
        options={[
          ...(currentElement !== null
            ? [
                {
                  value: "Element",
                  children: (
                    <TemplateElementSettings
                      element={currentElement.element}
                      onUpdate={onUpdateTemplateElements}
                    />
                  ),
                },
              ]
            : []),
          {
            value: "Template",
            children: (
              <TemplateMetadataSettings
                metadata={templateMetadata!}
                onUpdate={(cb) =>
                  setTemplateMetadata((old) => {
                    if (!old) {
                      return old;
                    }
                    return produce(old, cb);
                  })
                }
              />
            ),
          },
        ]}
        value={currentTab}
      />
      <div
        style={{
          borderTop: "1px solid var(--figma-color-border)",
          paddingTop: "1rem",
          marginTop: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: elements.length === 0 ? "150px" : "auto",
          }}
        >
          <Container space="medium">
            <Text>
              <Muted>Elements</Muted>
            </Text>
            <VerticalSpace space="small" />
          </Container>

          {elements.length === 0 ? (
            <MiddleAlign style={{ flex: 1 }}>
              <Muted>No elements found</Muted>
            </MiddleAlign>
          ) : (
            <ElementsList
              elements={elements}
              currentId={currentId}
              onElementClick={(id) => setCurrentId(id)}
            />
          )}
        </div>
        <div style={{ height: "80px" }}></div>
      </div>

      <Container
        space="medium"
        style={{
          background: "white",
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1,
        }}
      >
        <VerticalSpace space="small" />
        <Columns space="extraSmall">
          <Button fullWidth onClick={handleExportClick}>
            Export
          </Button>
          <Button fullWidth onClick={handleCloseButtonClick} secondary>
            Close
          </Button>
        </Columns>
        <VerticalSpace space="small" />
      </Container>
    </div>
  );
}

export default render(Plugin);
