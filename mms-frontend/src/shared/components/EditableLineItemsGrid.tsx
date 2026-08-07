import { Dispatch, SetStateAction, useMemo } from 'react';
import { Autocomplete, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRenderEditCellParams,
  GridRowId,
  GridValidRowModel,
  useGridApiRef,
} from '@mui/x-data-grid';

export interface LineGridTotals {
  totalItems: number;
  totalQuantity?: number;
  totalAmount?: number;
}

export interface EditableLineItemsGridProps<R extends GridValidRowModel> {
  rows: R[];
  setRows: Dispatch<SetStateAction<R[]>>;
  columns: GridColDef<R>[];
  createRow: () => R;
  getRowId: (row: R) => GridRowId;
  processRowUpdate?: (newRow: R, oldRow: R, currentRows: R[]) => R;
  onRowUpdateCommitted?: (newRow: R, oldRow: R) => Promise<R> | R;
  onRowDelete?: (row: R) => Promise<void> | void;
  validateRow?: (row: R, currentRows: R[]) => Record<string, string>;
  shouldConfirmDelete?: (row: R) => boolean;
  getDeleteConfirmMessage?: (row: R) => string;
  addRowLabel?: string;
  focusField?: string;
  totals?: LineGridTotals;
  height?: number;
  disabled?: boolean;
}

function formatSummaryNumber(value?: number): string {
  if (value === undefined || Number.isNaN(value)) return '0';
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

interface SingleSelectOption {
  value: string;
  label: string;
}

function normalizeSingleSelectOptions(valueOptions: unknown): SingleSelectOption[] {
  if (!Array.isArray(valueOptions)) return [];

  return valueOptions.map((option) => {
    if (option && typeof option === 'object' && 'value' in option) {
      const candidate = option as { value: unknown; label?: unknown };
      const value = String(candidate.value ?? '');
      const label = String(candidate.label ?? candidate.value ?? '');
      return { value, label };
    }

    const value = String(option ?? '');
    return { value, label: value };
  });
}

function SingleSelectAutocompleteEditCell(params: GridRenderEditCellParams) {
  const singleSelectColDef = params.colDef as GridColDef & { valueOptions?: unknown };
  const options = normalizeSingleSelectOptions(singleSelectColDef.valueOptions);
  const selected = options.find((option) => option.value === String(params.value ?? '')) || null;

  return (
    <Autocomplete
      size="small"
      options={options}
      value={selected}
      isOptionEqualToValue={(option, value) => option.value === value.value}
      getOptionLabel={(option) => option.label}
      onChange={async (_, option) => {
        await params.api.setEditCellValue({
          id: params.id,
          field: params.field,
          value: option ? option.value : '',
        });
        params.api.stopCellEditMode({ id: params.id, field: params.field });
      }}
      renderInput={(inputParams) => (
        <TextField
          {...inputParams}
          autoFocus
          variant="standard"
          placeholder={params.colDef.headerName}
        />
      )}
      sx={{ width: '100%' }}
      disableClearable={false}
      autoHighlight
      openOnFocus
    />
  );
}

export default function EditableLineItemsGrid<R extends GridValidRowModel>({
  rows,
  setRows,
  columns,
  createRow,
  getRowId,
  processRowUpdate,
  onRowUpdateCommitted,
  onRowDelete,
  validateRow,
  shouldConfirmDelete,
  getDeleteConfirmMessage,
  addRowLabel = 'Add Row',
  focusField,
  totals,
  height = 420,
  disabled = false,
}: EditableLineItemsGridProps<R>) {
  const apiRef = useGridApiRef();

  const errorMap = useMemo(() => {
    if (!validateRow) return {} as Record<string, Record<string, string>>;

    const map: Record<string, Record<string, string>> = {};
    rows.forEach((row) => {
      const rowErrors = validateRow(row, rows);
      if (Object.keys(rowErrors).length > 0) {
        map[String(getRowId(row))] = rowErrors;
      }
    });
    return map;
  }, [rows, validateRow, getRowId]);

  const errorMessages = useMemo(() => {
    const messages = new Set<string>();
    rows.forEach((row, index) => {
      const rowErrors = errorMap[String(getRowId(row))];
      if (!rowErrors) return;
      Object.values(rowErrors).forEach((message) => {
        if (message) {
          messages.add(`Row ${index + 1}: ${message}`);
        }
      });
    });
    return Array.from(messages).slice(0, 8);
  }, [rows, errorMap, getRowId]);

  const resolvedColumns = useMemo(() => {
    const columnsWithAutocomplete = columns.map((column) => {
      if (column.type === 'singleSelect' && !column.renderEditCell) {
        return {
          ...column,
          renderEditCell: (params: GridRenderEditCellParams) => (
            <SingleSelectAutocompleteEditCell {...params} />
          ),
        };
      }

      return column;
    });

    return [
      ...columnsWithAutocomplete,
      {
        field: '__actions__',
        type: 'actions',
        headerName: 'Actions',
        width: 90,
        getActions: (params: { id: GridRowId }) => [
          <GridActionsCellItem
            key={`delete-${String(params.id)}`}
            icon={<DeleteIcon fontSize="small" />}
            label="Delete"
            disabled={disabled}
            onClick={async () => {
              const targetRow = rows.find((item) => String(getRowId(item)) === String(params.id));
              if (!targetRow) return;

              const needsConfirm = shouldConfirmDelete ? shouldConfirmDelete(targetRow) : false;
              if (needsConfirm) {
                const message = getDeleteConfirmMessage
                  ? getDeleteConfirmMessage(targetRow)
                  : 'Delete this saved detail row?';
                if (!window.confirm(message)) {
                  return;
                }
              }

              if (onRowDelete) {
                await onRowDelete(targetRow);
              }

              setRows((current) => current.filter((item) => String(getRowId(item)) !== String(params.id)));
            }}
            showInMenu={false}
          />,
        ],
      } as GridColDef<R>,
    ];
  }, [columns, rows, getRowId, shouldConfirmDelete, getDeleteConfirmMessage, setRows, disabled, onRowDelete]);

  const defaultFocusField = useMemo(() => {
    const firstEditable = columns.find((column) => column.editable);
    return focusField || firstEditable?.field || columns[0]?.field;
  }, [columns, focusField]);

  const handleAddRow = () => {
    if (disabled) return;
    const newRow = createRow();
    const newRowId = getRowId(newRow);

    setRows((current) => [...current, newRow]);

    if (!defaultFocusField) return;

    requestAnimationFrame(() => {
      try {
        apiRef.current.setCellFocus(newRowId, defaultFocusField);
      } catch {
        // no-op if grid is not ready yet
      }
    });
  };

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight={600}>Line Items</Typography>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddRow} disabled={disabled}>
          {addRowLabel}
        </Button>
      </Stack>

      <Paper variant="outlined" onKeyDown={(event) => {
        if (event.key === 'Insert') {
          event.preventDefault();
          handleAddRow();
        }
      }}>
        <DataGrid
          apiRef={apiRef}
          rows={rows}
          columns={resolvedColumns}
          getRowId={(row) => getRowId(row as R)}
          editMode="cell"
          disableRowSelectionOnClick
          processRowUpdate={async (newRow, oldRow) => {
            const castNew = newRow as R;
            const castOld = oldRow as R;
            let finalRow = castNew;

            const currentRows = rows as R[];
            finalRow = processRowUpdate ? processRowUpdate(castNew, castOld, currentRows) : castNew;

            if (onRowUpdateCommitted) {
              finalRow = await onRowUpdateCommitted(finalRow, castOld);
            }

            setRows((current) => {
              return current.map((row) => (String(getRowId(row)) === String(getRowId(castOld)) ? finalRow : row));
            });

            return finalRow;
          }}
          onProcessRowUpdateError={(err) => {
            console.error('Failed to update detail row', err);
          }}
          isCellEditable={() => !disabled}
          getCellClassName={(params) => {
            const rowErrors = errorMap[String(params.id)];
            return rowErrors?.[params.field] ? 'editable-grid-error-cell' : '';
          }}
          columnBuffer={8}
          rowBuffer={8}
          disableColumnMenu={false}
          disableColumnFilter={false}
          disableColumnSelector={false}
          disableDensitySelector
          sx={{
            height,
            border: 0,
            '& .MuiDataGrid-columnHeaders': {
              borderBottom: 1,
              borderColor: 'divider',
            },
            '& .editable-grid-error-cell': {
              backgroundColor: 'rgba(211, 47, 47, 0.08)',
            },
          }}
        />
      </Paper>

      {errorMessages.length > 0 && (
        <Box sx={{ color: 'error.main' }}>
          {errorMessages.map((message) => (
            <Typography key={message} variant="caption" display="block">
              {message}
            </Typography>
          ))}
        </Box>
      )}

      {totals && (
        <Stack direction="row" spacing={3} justifyContent="flex-end" sx={{ pr: 0.5 }}>
          <Typography variant="body2"><strong>Total Items:</strong> {formatSummaryNumber(totals.totalItems)}</Typography>
          {totals.totalQuantity !== undefined && (
            <Typography variant="body2"><strong>Total Quantity:</strong> {formatSummaryNumber(totals.totalQuantity)}</Typography>
          )}
          {totals.totalAmount !== undefined && (
            <Typography variant="body2"><strong>Total Amount:</strong> {formatSummaryNumber(totals.totalAmount)}</Typography>
          )}
        </Stack>
      )}
    </Stack>
  );
}
