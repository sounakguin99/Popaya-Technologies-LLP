import { controller, httpGet, httpPost } from "inversify-express-utils";
import { Request, Response } from "express";
import { inject } from "inversify";
import { LeadService } from "../services/lead.service";

@controller("")
export class LeadController {
    constructor(
        @inject(LeadService) private _leadService: LeadService
    ) {}

    /**
     * GET /
     * Root endpoint to verify server is running.
     */
    @httpGet("/")
    async getRoot(req: Request, res: Response) {
        return res.status(200).send("Lead Profiling Server is running successfully!");
    }

    /**
     * POST /analyze
     * Import and analyze provided lead data JSON.

     * If request body contains an array of leads, uses that.
     * Otherwise, falls back to reading from sample_lead_data.json.
     */
    @httpPost("/analyze")
    async analyze(req: Request, res: Response) {
        try {
            const rawLeads = req.body && Array.isArray(req.body) && req.body.length > 0
                ? req.body
                : undefined;

            const result = this._leadService.analyzeLeads(rawLeads);

            return res.status(200).json({
                success: true,
                message: "Lead data analyzed successfully",
                summary: result,
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message || "Failed to analyze lead data",
            });
        }
    }

    /**
     * GET /lead/:leadPhoneNumber
     * Returns a detailed profile of a specific lead by phone number.
     * Includes all sale and rental lead data related to that phone number.
     */
    @httpGet("/lead/:leadPhoneNumber")
    async getLeadByPhone(req: Request, res: Response) {
        try {
            const phoneNumber = req.params.leadPhoneNumber;

            if (!phoneNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number parameter is required",
                });
            }

            const profile = this._leadService.getLeadByPhone(phoneNumber);

            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: `Lead with phone number "${phoneNumber}" not found`,
                });
            }

            return res.status(200).json({
                success: true,
                profile: profile,
            });
        } catch (error: any) {
            // If data hasn't been analyzed yet, return a helpful error
            if (error.message && error.message.includes("not analyzed yet")) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                message: error.message || "Internal server error",
            });
        }
    }

    /**
     * GET /leadSummary (🌟 Bonus Point)
     * Provides a summary of lead profiling metrics like total leads,
     * unique locations, average budgets, and inquiry rate.
     */
    @httpGet("/leadSummary")
    async getLeadSummary(req: Request, res: Response) {
        try {
            const summary = this._leadService.getLeadSummary();

            return res.status(200).json({
                success: true,
                summary: summary,
            });
        } catch (error: any) {
            if (error.message && error.message.includes("not analyzed yet")) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                message: error.message || "Internal server error",
            });
        }
    }
}
