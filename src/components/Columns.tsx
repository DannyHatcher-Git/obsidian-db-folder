import {
  DataTypes,
  DEFAULT_COLUMN_CONFIG,
  DatabaseLimits,
  MetadataColumns,
  MetadataDatabaseColumns,
} from "helpers/Constants";
import { TableColumn } from "cdm/FolderModel";
import { LOGGER } from "services/Logger";
import { DatabaseColumn } from "cdm/DatabaseModel";
import { RowSelectOption } from "cdm/ComponentsModel";
import { LocalSettings } from "cdm/SettingsModel";
import { dbTrim } from "helpers/StylesHelper";
import { TFile } from "obsidian";
import { DataviewService } from "services/DataviewService";
import { Literal } from "obsidian-dataview/lib/data-model/value";
import { DatabaseView } from "DatabaseView";
import { obtainAllPossibleRows } from "helpers/VaultManagement";

/**
 * Add mandatory and configured metadata columns of the table
 * @param columns
 * @returns
 */
export async function obtainMetadataColumns(
  yamlColumns: Record<string, DatabaseColumn>,
  localSetting: LocalSettings
): Promise<Record<string, DatabaseColumn>> {
  // If File is not already in the table, add it
  yamlColumns[MetadataColumns.FILE] = {
    ...MetadataDatabaseColumns.FILE,
    ...(yamlColumns[MetadataColumns.FILE] ?? {}),
  };

  if (localSetting.show_metadata_created) {
    // If Created is not already in the table, add it
    yamlColumns[MetadataColumns.CREATED] = {
      ...MetadataDatabaseColumns.CREATED,
      ...(yamlColumns[MetadataColumns.CREATED] ?? {}),
    };
  } else {
    delete yamlColumns[MetadataColumns.CREATED];
  }

  if (localSetting.show_metadata_modified) {
    // If Modified is not already in the table, add it
    yamlColumns[MetadataColumns.MODIFIED] = {
      ...MetadataDatabaseColumns.MODIFIED,
      ...(yamlColumns[MetadataColumns.MODIFIED] ?? {}),
    };
  } else {
    delete yamlColumns[MetadataColumns.MODIFIED];
  }

  if (localSetting.show_metadata_tasks) {
    // If TASKS is not already in the table, add it
    yamlColumns[MetadataColumns.TASKS] = {
      ...MetadataDatabaseColumns.TASKS,
      ...(yamlColumns[MetadataColumns.TASKS] ?? {}),
    };
  } else {
    delete yamlColumns[MetadataColumns.TASKS];
  }

  yamlColumns[MetadataColumns.ADD_COLUMN] = {
    ...MetadataDatabaseColumns.ADD_COLUMN,
    position: DatabaseLimits.MAX_COLUMNS + 1,
  };
  return yamlColumns;
}

/**
 * Given a record of columns of yaml file, return a record of columns of the table
 * @param databaseColumns
 * @returns
 */
export async function obtainColumnsFromFolder(
  databaseColumns: Record<string, DatabaseColumn>
): Promise<TableColumn[]> {
  LOGGER.debug(
    `=> obtainColumnsFromFolder. databaseColumns: ${JSON.stringify(
      databaseColumns
    )}`
  );
  const columns: TableColumn[] = [];
  await Promise.all(
    Object.keys(databaseColumns).map(async (columnKey, index) => {
      const column = databaseColumns[columnKey];
      columns.push(await columnOptions(columnKey, index, column));
    })
  );
  LOGGER.debug(`<= obtainColumnsFromFolder(. return ${columns.length} columns`);
  return sortColumnsByPosition(columns);
}

export async function obtainColumnsFromFile(
  file: TFile
): Promise<Record<string, DatabaseColumn>> {
  const columns: Record<string, DatabaseColumn> = {};
  const propertiesOfFile = DataviewService.getDataviewAPI().page(file.path);
  // Check if propertiesOfFile is empty
  if (propertiesOfFile.length === 0) {
    return columns;
  }

  Object.entries(propertiesOfFile).forEach(([key, value], index) => {
    const input = getInputInFuctionOfLiteral(value);
    const newColumn: DatabaseColumn = {
      input: input,
      accessorKey: key,
      label: key,
      key: key,
      position: index,
      config: DEFAULT_COLUMN_CONFIG,
    };
    columns[key] = newColumn;
  });
  // remove metadata fields of dataview
  delete columns["file"];
  return columns;
}

export async function obtainColumnsFromRows(
  view: DatabaseView
): Promise<Record<string, DatabaseColumn>> {
  const columns: Record<string, DatabaseColumn> = {};
  const rows = await obtainAllPossibleRows(
    view.file.parent.path,
    view.diskConfig.yaml
  );
  // Obtain unique keys from source
  const keys = rows.reduce((acc, row) => {
    const keys = Object.keys(row).map((key) => key.toLowerCase());
    // Remove duplicates
    return [...new Set([...acc, ...keys])];
  }, [] as string[]);
  // Add keys to columns
  keys
    // Check metadata columns to not be added
    .filter((key) => validateColumnKey(key))
    .forEach((key, index) => {
      columns[key] = {
        input: DataTypes.TEXT,
        accessorKey: key,
        label: key,
        key: key,
        position: index,
        config: DEFAULT_COLUMN_CONFIG,
      };
    });

  return columns;
}

function getInputInFuctionOfLiteral(literal: Literal) {
  const wrappedLiteral = DataviewService.wrapLiteral(literal);
  let input = DataTypes.TEXT;
  switch (wrappedLiteral.type) {
    case DataTypes.NUMBER:
      input = DataTypes.NUMBER;
      break;
    case "date":
      input = DataTypes.CALENDAR;
      break;
    case "duration":
      input = DataTypes.CALENDAR_TIME;
      break;
    default:
      input = DataTypes.TEXT;
  }
  return input;
}

function columnOptions(
  columnKey: string,
  index: number,
  column: DatabaseColumn
): TableColumn {
  LOGGER.debug(`=> columnOptions. column: ${JSON.stringify(column)}`);
  const options: RowSelectOption[] = column.options ?? [];
  if ((Object.values(DataTypes) as Array<string>).includes(column.input)) {
    LOGGER.debug(`<= columnOptions`, `return ${column.input} column`);
    return {
      ...(column as Partial<TableColumn>),
      position: column.position ?? index,
      key: column.key ?? columnKey,
      accessorKey: column.accessorKey ?? dbTrim(column.label),
      csvCandidate: column.csvCandidate ?? true,
      id: columnKey,
      label: column.label,
      dataType: column.input,
      options: options,
      config: column.config,
    };
  } else {
    throw `Error: option ${column.input} not supported yet`;
  }
}

function validateColumnKey(columnKey: string): boolean {
  if (columnKey.startsWith("__") && columnKey.endsWith("__")) {
    return false;
  }
  return true;
}
function sortColumnsByPosition(columns: TableColumn[]): TableColumn[] {
  return columns.sort((a, b) => {
    if (a.position < b.position) {
      return -1;
    } else if (a.position > b.position) {
      return 1;
    } else {
      return 0;
    }
  });
}
