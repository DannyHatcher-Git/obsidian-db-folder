import { CellComponentProps } from "cdm/ComponentsModel";
import { renderMarkdown } from "components/obsidianArq/MarkdownRenderer";
import { c } from "helpers/StylesHelper";
import { DateTime } from "luxon";
import React, { useEffect, useRef } from "react";

const MetadataTimeCell = (mdProps: CellComponentProps) => {
  const { defaultCell } = mdProps;
  const { cell } = defaultCell;
  const mdRef = useRef<HTMLDivElement>();
  useEffect(() => {
    if (mdRef.current !== null) {
      mdRef.current.innerHTML = "";
      const cellValue = cell.getValue();
      // Apply config formatting
      let metadataValue = (cellValue as DateTime).toFormat("yyyy-MM-dd h:mm a");
      // Render the markdown with daily notes link
      // TODO obtain daily format from dailies plugin if its enabled
      metadataValue = `[[${(cellValue as DateTime).toFormat(
        "yyyy-MM-dd"
      )}|${metadataValue}]]`;

      renderMarkdown(defaultCell, metadataValue, mdRef.current, 5);
    }
  });
  return (
    <span
      ref={mdRef}
      className={`${c("md_cell")}`}
      key={`metadata_time_${cell.id}`}
    />
  );
};

export default MetadataTimeCell;
