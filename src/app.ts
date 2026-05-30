import "reflect-metadata";
import { InversifyExpressServer } from "inversify-express-utils";
import express from "express";
import container from "../inversify.config";

const server = new InversifyExpressServer(container);

// Configure Express middleware
server.setConfig((app) => {
    app.use(express.json({ limit: "10mb" })); // Support large lead data payloads
});

const PORT = process.env.PORT || 8000;
server.build().listen(PORT, () => console.log(`Server started on port ${PORT}`));