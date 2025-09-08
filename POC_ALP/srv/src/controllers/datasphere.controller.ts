import { Request, Response } from "express";
import DatasphereService from "../services/datasphere.service";
import { asyncHandler } from "../middleware/error.middleware";

export class DatasphereController {
  getRoot = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    await DatasphereService.handleRoot();
  });

  getData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const path = Object.values(req.params).join("/");

    // Validate path and get content type
    const { contentType } = DatasphereService.validateAndProcessPath(path);

    // Set content type if specified
    if (contentType) {
      res.set("Content-Type", contentType);
    }

    // Fetch data
    const result = await DatasphereService.getData(req, path);
    res.send(result.data);
  });

  handleBatch = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Process batch request
    const batchResponse = await DatasphereService.processBatchRequest(req);

    // Set response headers
    DatasphereService.setBatchResponseHeaders(res, batchResponse.id);

    // Send response
    res.send(batchResponse.body);
  });
}

export default new DatasphereController();
