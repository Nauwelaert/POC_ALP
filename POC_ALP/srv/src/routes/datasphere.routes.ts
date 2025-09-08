import express, { Router } from "express";
import { batchMiddleware } from "../middleware/batch.middleware";
import DatasphereController from "../controllers/datasphere.controller";

const router: Router = express.Router();

// Root endpoint
router.get("/", DatasphereController.getRoot.bind(DatasphereController));

// Get data endpoint
router.get("/*", DatasphereController.getData.bind(DatasphereController));

// Batch processing endpoint
router.post("/*\\$batch", batchMiddleware, DatasphereController.handleBatch.bind(DatasphereController));

export default router;
