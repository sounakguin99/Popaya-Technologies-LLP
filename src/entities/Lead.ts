// Raw lead as received from JSON input (before validation/cleaning)
export interface RawLead {
    lead_id: number;
    name: string;
    phone: string;
    email: string;
    property_type: string;
    budget: number | string;
    location: string;
    preferred_property_type: string;
    contact_date: string;
    inquiry_notes: string;
}

// Validated & cleaned lead
export interface Lead {
    lead_id: number;
    name: string;
    phone: string;                  // Standardized E.164 format
    email: string;                  // Validated email
    property_type: "sale" | "rental";
    budget: number;                 // Numeric value
    location: string;              // Trimmed & title-cased
    preferred_property_type: "apartment" | "house" | "condo" | "townhouse";
    contact_date: string;          // ISO date string
    inquiry_notes: string;
    is_valid: boolean;             // Whether the record passed all validations
    validation_errors: string[];   // List of issues found during validation
}

// Lead profile: groups all inquiries by a unique phone number
export interface LeadProfile {
    phone: string;
    name: string;
    email: string;
    sale_leads: Lead[];
    rental_leads: Lead[];
    total_inquiries: number;
}

// Summary profiling metrics
export interface LeadSummary {
    total_leads: number;
    total_unique_leads: number;
    unique_location_count: number;
    unique_locations: string[];
    leads_by_property_type: {
        sale: number;
        rental: number;
    };
    average_budget_sale: number;       // 🌟 Bonus
    average_budget_rental: number;     // 🌟 Bonus
    average_inquiry_rate: {            // 🌟 Bonus
        leads_per_month: number;
        date_range: {
            start: string;
            end: string;
        };
    };
}

// Result returned by the POST /analyze endpoint
export interface AnalysisResult {
    total_records_received: number;
    valid_records: number;
    invalid_records: number;
    duplicate_phone_numbers: number;
    unique_leads: number;
    data_saved_to: string;
    validation_errors: { lead_id: number; errors: string[] }[];
}
