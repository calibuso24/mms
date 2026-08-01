import { Dispatch, SetStateAction, useMemo } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
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

export default function EditableLineItemsGrid<R extends GridValidRowModel>({
  rows,
  setRows,
  columns,
  createRow,
  getRowId,
  processRowUpdate,
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
    return [
      ...columns,
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

              setRows((current) => current.filter((item) => String(getRowId(item)) !== String(params.id)));
            }}
            showInMenu={false}
          />,
        ],
      } as GridColDef<R>,
    ];
  }, [columns, rows, getRowId, shouldConfirmDelete, getDeleteConfirmMessage, setRows, disabled]);

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
          processRowUpdate={(newRow, oldRow) => {
            const castNew = newRow as R;
            const castOld = oldRow as R;
            let finalRow = castNew;

            setRows((current) => {
              finalRow = processRowUpdate ? processRowUpdate(castNew, castOld, current) : castNew;
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
