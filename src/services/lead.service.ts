import { injectable } from "inversify";
import * as fs from "fs";
import * as path from "path";
import { RawLead, Lead, LeadProfile, LeadSummary, AnalysisResult } from "../entities/Lead";
import { validateLead, standardizePhone } from "../utils/validators";

const ANALYZED_DATA_PATH = path.join(__dirname, "../data/analyzed_leads.json");
const SAMPLE_DATA_PATH = path.join(__dirname, "../data/sample_lead_data.json");

@injectable()
export class LeadService {

    /**
     * Import, validate, clean, deduplicate, and save analyzed lead data.
     * If no leads are provided, reads from sample_lead_data.json.
     */
    analyzeLeads(rawLeads?: RawLead[]): AnalysisResult {
        // Step 1: Determine data source
        let leads: RawLead[];

        if (rawLeads && Array.isArray(rawLeads) && rawLeads.length > 0) {
            leads = rawLeads;
        } else {
            // Fallback: read from sample data file
            if (!fs.existsSync(SAMPLE_DATA_PATH)) {
                throw new Error("No lead data provided and sample data file not found.");
            }
            const fileContent = fs.readFileSync(SAMPLE_DATA_PATH, "utf-8");
            leads = JSON.parse(fileContent);
        }

        // Step 2: Validate & clean each lead
        const cleanedLeads: Lead[] = leads.map((raw) => validateLead(raw));

        // Step 3: Count duplicates (leads sharing the same phone number)
        const phoneGroups = new Map<string, Lead[]>();
        for (const lead of cleanedLeads) {
            const phone = lead.phone;
            if (!phoneGroups.has(phone)) {
                phoneGroups.set(phone, []);
            }
            phoneGroups.get(phone)!.push(lead);
        }

        // Count phone numbers that appear more than once
        let duplicatePhoneCount = 0;
        for (const [, group] of phoneGroups) {
            if (group.length > 1) {
                duplicatePhoneCount++;
            }
        }

        // Step 4: Save cleaned data to analyzed_leads.json
        const dataDir = path.dirname(ANALYZED_DATA_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(ANALYZED_DATA_PATH, JSON.stringify(cleanedLeads, null, 4), "utf-8");

        // Step 5: Collect validation errors for the response
        const validationErrors = cleanedLeads
            .filter((lead) => !lead.is_valid)
            .map((lead) => ({
                lead_id: lead.lead_id,
                errors: lead.validation_errors,
            }));

        // Step 6: Build the result
        const result: AnalysisResult = {
            total_records_received: leads.length,
            valid_records: cleanedLeads.filter((l) => l.is_valid).length,
            invalid_records: cleanedLeads.filter((l) => !l.is_valid).length,
            duplicate_phone_numbers: duplicatePhoneCount,
            unique_leads: phoneGroups.size,
            data_saved_to: "src/data/analyzed_leads.json",
            validation_errors: validationErrors,
        };

        return result;
    }

    /**
     * Get a detailed lead profile by phone number.
     * Groups all sale and rental leads for the same phone number.
     */
    getLeadByPhone(phoneNumber: string): LeadProfile | null {
        const cleanedLeads = this.loadAnalyzedData();

        // Standardize the incoming phone number for matching
        const standardizedPhone = standardizePhone(phoneNumber);

        // Find all leads matching this phone number
        const matchingLeads = cleanedLeads.filter(
            (lead) => lead.phone === standardizedPhone
        );

        if (matchingLeads.length === 0) {
            return null;
        }

        // Group into sale and rental leads
        const saleLeads = matchingLeads.filter((l) => l.property_type === "sale");
        const rentalLeads = matchingLeads.filter((l) => l.property_type === "rental");

        // Use the most recent lead's name and email as canonical
        const sortedByDate = [...matchingLeads].sort(
            (a, b) => new Date(b.contact_date).getTime() - new Date(a.contact_date).getTime()
        );

        const profile: LeadProfile = {
            phone: standardizedPhone,
            name: sortedByDate[0].name,
            email: sortedByDate[0].email,
            sale_leads: saleLeads,
            rental_leads: rentalLeads,
            total_inquiries: matchingLeads.length,
        };

        return profile;
    }

    /**
     * Get profiling summary metrics across all analyzed leads.
     * Includes bonus metrics: average budget by type and inquiry rate.
     */
    getLeadSummary(): LeadSummary {
        const cleanedLeads = this.loadAnalyzedData();

        // Total leads
        const totalLeads = cleanedLeads.length;

        // Unique leads (by phone number)
        const uniquePhones = new Set(cleanedLeads.map((l) => l.phone));
        const totalUniqueLeads = uniquePhones.size;

        // Unique locations
        const uniqueLocations = [...new Set(cleanedLeads.map((l) => l.location))].sort();
        const uniqueLocationCount = uniqueLocations.length;

        // Leads by property type
        const saleLeads = cleanedLeads.filter((l) => l.property_type === "sale");
        const rentalLeads = cleanedLeads.filter((l) => l.property_type === "rental");

        // 🌟 Bonus: Average budget per lead type
        const averageBudgetSale =
            saleLeads.length > 0
                ? Math.round(
                      (saleLeads.reduce((sum, l) => sum + l.budget, 0) / saleLeads.length) * 100
                  ) / 100
                : 0;

        const averageBudgetRental =
            rentalLeads.length > 0
                ? Math.round(
                      (rentalLeads.reduce((sum, l) => sum + l.budget, 0) / rentalLeads.length) *
                          100
                  ) / 100
                : 0;

        // 🌟 Bonus: Average inquiry rate (leads per month)
        const dates = cleanedLeads
            .map((l) => new Date(l.contact_date))
            .filter((d) => !isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());

        let leadsPerMonth = 0;
        let dateRange = { start: "", end: "" };

        if (dates.length > 0) {
            const startDate = dates[0];
            const endDate = dates[dates.length - 1];
            dateRange = {
                start: startDate.toISOString().split("T")[0],
                end: endDate.toISOString().split("T")[0],
            };

            // Calculate months between first and last date
            const monthsDiff =
                (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                (endDate.getMonth() - startDate.getMonth());

            // At least 1 month to avoid division by zero
            const months = Math.max(monthsDiff, 1);
            leadsPerMonth = Math.round((totalLeads / months) * 100) / 100;
        }

        const summary: LeadSummary = {
            total_leads: totalLeads,
            total_unique_leads: totalUniqueLeads,
            unique_location_count: uniqueLocationCount,
            unique_locations: uniqueLocations,
            leads_by_property_type: {
                sale: saleLeads.length,
                rental: rentalLeads.length,
            },
            average_budget_sale: averageBudgetSale,
            average_budget_rental: averageBudgetRental,
            average_inquiry_rate: {
                leads_per_month: leadsPerMonth,
                date_range: dateRange,
            },
        };

        return summary;
    }

    /**
     * Load analyzed leads from the JSON file.
     * Throws if the file doesn't exist (data not yet analyzed).
     */
    private loadAnalyzedData(): Lead[] {
        if (!fs.existsSync(ANALYZED_DATA_PATH)) {
            throw new Error(
                "Data not analyzed yet. Please call POST /analyze first."
            );
        }
        const fileContent = fs.readFileSync(ANALYZED_DATA_PATH, "utf-8");
        return JSON.parse(fileContent) as Lead[];
    }
}
