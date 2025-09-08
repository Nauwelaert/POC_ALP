/**
 * Main application entry point
 * @module index
 */
/*
import express, { Application, Request, Response, NextFunction } from "express";
import passport from "passport";
import { v3 as xssec } from "@sap/xssec";
import bodyParser from "body-parser";

import config, { AppConfig, ServerConfig } from "./src/config/app.config";
import { batchMiddleware } from "./src/middleware/batch.middleware";
import datasphereRoutes from "./src/routes/datasphere.routes";
const fs = require('fs');
const path = require('path');
// Initialize Express app
const app: Application = express();

app.use((req, res, next) => {
  next();
})

// Initialize Passport with XSUAA strategy
passport.use(new xssec.JWTStrategy(config.uaa, {}));
app.use(passport.initialize());
app.use(passport.authenticate("JWT", { session: false }));

// Middleware .:. Apply batch processing
app.use(batchMiddleware);



app.use((req, res, next) => {
  console.log("test");
if(req.url.includes("$metadata")){
  const filePath = path.join(__dirname, 'metadata.xml'); // Replace with your file path

  fs.readFile(filePath, 'utf8', (err: any, data: any) => {
    if (err) {
      console.error('Error reading file:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    // Send the file content as the response
    res.set('Content-Type', 'application/xml');
    res.send(data);
  });


}});


// Configure body parser for specific route
app.use(
  "/datasphere/dwc/consumption/analytical/VANDEK13/Sales_Demo_Analytical_Model/$batch",
  bodyParser.raw({ type: "*/
  /*" }),
  (req: Request, res: Response, next: NextFunction) => {
    next();
  }
);

// Routes .:. Mount Datasphere routes
app.use("/datasphere", datasphereRoutes);

// Start the server
const { port, timeout } = config.server as ServerConfig;

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

server.setTimeout(timeout);

// Export app for testing purposes
//export default app;
