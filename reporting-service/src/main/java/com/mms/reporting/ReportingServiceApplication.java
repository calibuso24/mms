package com.mms.reporting;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.Javalin;
import io.javalin.http.Context;
import net.sf.jasperreports.engine.JRDataSource;
import net.sf.jasperreports.engine.JREmptyDataSource;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRMapCollectionDataSource;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import net.sf.jasperreports.export.SimpleXlsxReportConfiguration;
import net.sf.jasperreports.engine.export.ooxml.JRDocxExporter;
import net.sf.jasperreports.engine.export.ooxml.JRXlsxExporter;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class ReportingServiceApplication {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private ReportingServiceApplication() {
    }

    public static void main(String[] args) {
        int port = Integer.parseInt(System.getenv().getOrDefault("REPORT_SERVICE_PORT", "8085"));
        Path reportsBaseDir = Paths
            .get(System.getenv().getOrDefault("REPORTS_BASE_DIR", "."))
            .toAbsolutePath()
            .normalize();

        Javalin app = Javalin.create();

        app.get("/health", ctx -> ctx.json(Map.of("status", "ok")));
        app.post("/reports/render", ctx -> handleRenderRequest(ctx, reportsBaseDir));

        app.exception(IllegalArgumentException.class, (error, ctx) -> {
            ctx.status(400).json(Map.of("error", error.getMessage()));
        });

        app.exception(JRException.class, (error, ctx) -> {
            ctx.status(500).json(Map.of("error", "Failed to render report", "details", error.getMessage()));
        });

        app.exception(Exception.class, (error, ctx) -> {
            ctx.status(500).json(Map.of("error", "Unexpected reporting service error", "details", error.getMessage()));
        });

        app.start(port);
        System.out.printf("MMS Reporting service running on port %d and reports base %s%n", port, reportsBaseDir);
    }

    private static void handleRenderRequest(Context ctx, Path reportsBaseDir) throws Exception {
        RenderRequest request = OBJECT_MAPPER.readValue(ctx.body(), RenderRequest.class);
        validateRequest(request);

        Path reportPath = resolveReportPath(reportsBaseDir, request.reportPath);
        JasperReport compiledReport = JasperCompileManager.compileReport(reportPath.toString());

        Map<String, Object> parameters = buildParameters(request.parameters, reportPath.getParent());
        JRDataSource dataSource = buildDataSource(request.data);
        JasperPrint jasperPrint = JasperFillManager.fillReport(compiledReport, parameters, dataSource);

        String normalizedFormat = normalizeFormat(request.format);
        byte[] output = export(jasperPrint, normalizedFormat);

        ctx.contentType(contentTypeByFormat(normalizedFormat));
        ctx.header("Content-Disposition", "inline; filename=\"rendered_report." + normalizedFormat + "\"");
        ctx.result(output);
    }

    private static void validateRequest(RenderRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }

        if (request.reportPath == null || request.reportPath.isBlank()) {
            throw new IllegalArgumentException("reportPath is required");
        }
    }

    private static Path resolveReportPath(Path reportsBaseDir, String reportPath) {
        Path resolved = reportsBaseDir.resolve(reportPath).normalize();
        if (!resolved.startsWith(reportsBaseDir)) {
            throw new IllegalArgumentException("Invalid reportPath: path traversal is not allowed");
        }

        if (!Files.exists(resolved)) {
            throw new IllegalArgumentException("JRXML file not found: " + reportPath);
        }

        return resolved;
    }

    private static Map<String, Object> buildParameters(Map<String, Object> incoming, Path reportDir) {
        Map<String, Object> parameters = new HashMap<>();
        if (incoming != null) {
            parameters.putAll(incoming);
        }

        parameters.putIfAbsent("REPORT_BASE_DIR", reportDir.toString());
        parameters.putIfAbsent("SUBREPORT_DIR", reportDir.toString() + "/");
        return parameters;
    }

    private static JRDataSource buildDataSource(List<Map<String, ?>> data) {
        if (data == null || data.isEmpty()) {
            return new JREmptyDataSource();
        }

        return new JRMapCollectionDataSource(data);
    }

    private static String normalizeFormat(String format) {
        String candidate = (format == null || format.isBlank()) ? "pdf" : format.toLowerCase(Locale.ROOT);

        if (candidate.equals("pdf")) {
            return "pdf";
        }

        if (candidate.equals("xlsx") || candidate.equals("excel")) {
            return "xlsx";
        }

        if (candidate.equals("docx") || candidate.equals("doc")) {
            return "docx";
        }

        throw new IllegalArgumentException("Unsupported format. Supported formats: pdf, xlsx, docx");
    }

    private static byte[] export(JasperPrint jasperPrint, String format) throws JRException {
        if (format.equals("pdf")) {
            return JasperExportManager.exportReportToPdf(jasperPrint);
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        if (format.equals("xlsx")) {
            JRXlsxExporter exporter = new JRXlsxExporter();
            exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
            exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(outputStream));

            SimpleXlsxReportConfiguration xlsxConfig = new SimpleXlsxReportConfiguration();
            xlsxConfig.setDetectCellType(true);
            xlsxConfig.setOnePagePerSheet(false);
            exporter.setConfiguration(xlsxConfig);
            exporter.exportReport();
            return outputStream.toByteArray();
        }

        JRDocxExporter exporter = new JRDocxExporter();
        exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
        exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(outputStream));
        exporter.exportReport();
        return outputStream.toByteArray();
    }

    private static String contentTypeByFormat(String format) {
        if (format.equals("pdf")) {
            return "application/pdf";
        }

        if (format.equals("xlsx")) {
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        }

        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    private static final class RenderRequest {
        public String reportPath;
        public Map<String, Object> parameters = Collections.emptyMap();
        public List<Map<String, ?>> data = Collections.emptyList();
        public String format = "pdf";
        public String paperSize;
        public String pageOrientation;
    }
}
