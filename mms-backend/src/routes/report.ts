import { Router } from 'express';
import { ReportController } from '../controllers/report.js';

const router = Router();
const reportController = new ReportController();

router.get('/', (req, res, next) => reportController.listReports(req, res, next));
router.get('/:reportCode/parameters', (req, res, next) =>
  reportController.getReportParameters(req, res, next)
);
router.post('/:reportCode/generate', (req, res, next) =>
  reportController.generate(req, res, next)
);

export default router;