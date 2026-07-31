import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { reportApi } from '../shared/api/client.js';

type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'docx';

interface ReportParameter {
  report_parameter_id: number;
  parameter_name: string;
  display_name: string;
  data_type_code: string;
  control_type_code: string;
  lookup_table: string | null;
  default_value: string | null;
  is_required: boolean;
  display_order: number;
}

interface ReportDefinition {
  report: {
    report_id: number;
    report_code: string;
    report_name: string;
    description: string | null;
    category_name: string | null;
    report_type_name: string | null;
    requires_parameter: boolean;
    default_export_format: string | null;
    paper_size: string | null;
    page_orientation: string | null;
    pdf: boolean;
    xlsx: boolean;
    csv: boolean;
    docx: boolean;
  };
  parameters: ReportParameter[];
}

interface ReportRunnerPageProps {
  reportCode: string;
}

function guessFormat(value: string | null | undefined): ExportFormat {
  const normalized = (value || 'pdf').toLowerCase();
  if (normalized === 'xlsx' || normalized === 'excel') return 'xlsx';
  if (normalized === 'docx' || normalized === 'doc') return 'docx';
  if (normalized === 'csv') return 'csv';
  return 'pdf';
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: 'pdf',  label: 'PDF' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'csv',  label: 'CSV' },
  { value: 'docx', label: 'Word (DOCX)' },
];

function extractFileName(headers: Headers, fallback: string): string {
  const disposition = headers.get('content-disposition');
  if (!disposition) {
    return fallback;
  }

  const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
  if (!match) {
    return fallback;
  }

  return match[1];
}

function getInputType(dataTypeCode: string): string {
  const code = dataTypeCode.toUpperCase();
  if (code === 'DATE') {
    return 'date';
  }

  if (code === 'INTEGER' || code === 'DECIMAL') {
    return 'number';
  }

  return 'text';
}

export default function ReportRunnerPage({ reportCode }: ReportRunnerPageProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [definition, setDefinition] = useState<ReportDefinition | null>(null);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const loadDefinition = async () => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const payload = (await reportApi.getParameters(reportCode)) as ReportDefinition;
        const defaultValues: Record<string, unknown> = {};

        payload.parameters.forEach((parameter) => {
          defaultValues[parameter.parameter_name] = parameter.default_value ?? '';
        });

        setDefinition(payload);
        setValues(defaultValues);
        const guessed = guessFormat(payload.report.default_export_format);
        const enabledFormats = FORMAT_OPTIONS.map((o) => o.value).filter((f) => payload.report[f]);
        setFormat(enabledFormats.includes(guessed) ? guessed : (enabledFormats[0] ?? 'pdf'));
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load report definition');
      } finally {
        setLoading(false);
      }
    };

    void loadDefinition();
  }, [reportCode]);

  const sortedParameters = useMemo(() => {
    if (!definition) {
      return [];
    }

    return [...definition.parameters].sort((a, b) => a.display_order - b.display_order);
  }, [definition]);

  const setParameterValue = (name: string, value: unknown) => {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const validateRequiredValues = (): string[] => {
    if (!definition) {
      return [];
    }

    return definition.parameters
      .filter((parameter) => parameter.is_required)
      .filter((parameter) => {
        const rawValue = values[parameter.parameter_name];
        if (rawValue === undefined || rawValue === null) {
          return true;
        }

        if (typeof rawValue === 'string' && rawValue.trim().length === 0) {
          return true;
        }

        return false;
      })
      .map((parameter) => parameter.display_name || parameter.parameter_name);
  };

  const handleGenerate = async () => {
    if (!definition) {
      return;
    }

    const missing = validateRequiredValues();
    if (missing.length > 0) {
      setError(`Missing required parameters: ${missing.join(', ')}`);
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await reportApi.generate(definition.report.report_code, {
        parameters: values,
        format,
      });

      const fallbackName = `${definition.report.report_code.toLowerCase()}_${Date.now()}.${format}`;
      const fileName = extractFileName(response.headers, fallbackName);
      const downloadUrl = URL.createObjectURL(response.blob);
      const anchor = document.createElement('a');

      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(downloadUrl);

      setSuccessMessage(`Report generated: ${fileName}`);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">Loading report definition...</Typography>
      </Paper>
    );
  }

  if (!definition) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">Unable to load report configuration.</Alert>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {definition.report.report_name}
        </Typography>
        {definition.report.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {definition.report.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Category: {definition.report.category_name || 'N/A'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Orientation: {definition.report.page_orientation || 'N/A'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Paper: {definition.report.paper_size || 'N/A'}
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 180, mb: 2 }}>
          <InputLabel id="report-format-label">Format</InputLabel>
          <Select
            labelId="report-format-label"
            value={format}
            label="Format"
            onChange={(event: SelectChangeEvent) => setFormat(event.target.value as ExportFormat)}
          >
            {FORMAT_OPTIONS.filter((option) => definition.report[option.value]).map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack spacing={2}>
          {sortedParameters.map((parameter) => {
            const inputType = getInputType(parameter.data_type_code);
            const currentValue = values[parameter.parameter_name] as string | number | undefined;
            const isDateField = inputType === 'date';
            const isBooleanField = parameter.data_type_code.toUpperCase() === 'BOOLEAN';

            if (isBooleanField) {
              const normalizedBoolean =
                currentValue === true || String(currentValue).toLowerCase() === 'true'
                  ? 'true'
                  : 'false';

              return (
                <FormControl key={parameter.report_parameter_id} fullWidth size="small">
                  <InputLabel id={`param-${parameter.report_parameter_id}`}>{parameter.display_name}</InputLabel>
                  <Select
                    labelId={`param-${parameter.report_parameter_id}`}
                    label={parameter.display_name}
                    value={normalizedBoolean}
                    onChange={(event: SelectChangeEvent) =>
                      setParameterValue(parameter.parameter_name, event.target.value === 'true')
                    }
                  >
                    <MenuItem value="true">True</MenuItem>
                    <MenuItem value="false">False</MenuItem>
                  </Select>
                </FormControl>
              );
            }

            return (
              <TextField
                key={parameter.report_parameter_id}
                size="small"
                fullWidth
                required={parameter.is_required}
                label={parameter.display_name}
                type={inputType}
                value={currentValue ?? ''}
                onChange={(event) => setParameterValue(parameter.parameter_name, event.target.value)}
                InputLabelProps={isDateField ? { shrink: true } : undefined}
              />
            );
          })}
        </Stack>

        <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
      {successMessage && <Alert severity="success">{successMessage}</Alert>}
    </Stack>
  );
}