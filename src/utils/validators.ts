import { RawLead, Lead } from "../entities/Lead";

/**
 * Validates an email address using a standard regex pattern.
 */
export function isValidEmail(email: string): boolean {
    if (!email || typeof email !== "string") return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validates a phone number in E.164 format.
 * Must start with '+' followed by 10-15 digits.
 */
export function isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== "string") return false;
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(phone);
}

/**
 * Standardizes a phone number to E.164 format.
 * Strips spaces, dashes, parentheses, and dots. Ensures '+' prefix.
 */
export function standardizePhone(phone: string): string {
    if (!phone || typeof phone !== "string") return phone;

    // Remove all non-digit characters except leading '+'
    let cleaned = phone.trim();
    const hasPlus = cleaned.startsWith("+");
    cleaned = cleaned.replace(/[^\d]/g, "");

    // Re-add the '+' prefix
    if (hasPlus) {
        cleaned = "+" + cleaned;
    } else if (cleaned.length >= 10) {
        // If no '+' and long enough, assume it needs one
        cleaned = "+" + cleaned;
    }

    return cleaned;
}

/**
 * Validates and standardizes property_type to "sale" | "rental".
 */
export function standardizePropertyType(type: string): { value: "sale" | "rental"; valid: boolean } {
    if (!type || typeof type !== "string") return { value: type as any, valid: false };

    const normalized = type.trim().toLowerCase();
    if (normalized === "sale" || normalized === "rental") {
        return { value: normalized, valid: true };
    }
    return { value: type as any, valid: false };
}

/**
 * Validates and standardizes preferred_property_type.
 */
export function standardizePreferredPropertyType(
    type: string
): { value: "apartment" | "house" | "condo" | "townhouse"; valid: boolean } {
    if (!type || typeof type !== "string") return { value: type as any, valid: false };

    const normalized = type.trim().toLowerCase();
    const validTypes = ["apartment", "house", "condo", "townhouse"];
    if (validTypes.includes(normalized)) {
        return { value: normalized as any, valid: true };
    }
    return { value: type as any, valid: false };
}

/**
 * Parses a budget value to a number.
 * Handles strings like "$300,000", "300K", "1.5M", or plain numbers.
 */
export function parseBudget(budget: any): { value: number; valid: boolean } {
    if (typeof budget === "number") {
        return { value: budget, valid: budget > 0 };
    }

    if (typeof budget === "string") {
        // Remove dollar signs, commas, and whitespace
        let cleaned = budget.trim().replace(/[$,\s]/g, "");

        // Handle shorthand like "300K" or "1.5M"
        const multiplierMatch = cleaned.match(/^([\d.]+)\s*([KkMm]?)$/);
        if (multiplierMatch) {
            let num = parseFloat(multiplierMatch[1]);
            const suffix = multiplierMatch[2].toUpperCase();
            if (suffix === "K") num *= 1000;
            if (suffix === "M") num *= 1000000;
            return { value: num, valid: num > 0 };
        }

        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) {
            return { value: parsed, valid: parsed > 0 };
        }
    }

    return { value: 0, valid: false };
}

/**
 * Standardizes a location string: trims whitespace and applies title case.
 */
export function standardizeLocation(location: string): string {
    if (!location || typeof location !== "string") return location;

    return location
        .trim()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

/**
 * Validates that a string is a valid ISO date.
 */
export function isValidDate(dateStr: string): boolean {
    if (!dateStr || typeof dateStr !== "string") return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

/**
 * Validates and cleans a single raw lead record.
 * Returns a Lead with is_valid flag and validation_errors array.
 */
export function validateLead(raw: RawLead): Lead {
    const errors: string[] = [];

    // Validate & standardize name
    const name = raw.name && typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) {
        errors.push("Name is missing or empty");
    }

    // Validate & standardize phone
    const phone = standardizePhone(raw.phone);
    if (!isValidPhone(phone)) {
        errors.push(`Invalid phone number: "${raw.phone}"`);
    }

    // Validate email
    const email = raw.email ? raw.email.trim().toLowerCase() : "";
    if (!isValidEmail(email)) {
        errors.push(`Invalid email address: "${raw.email}"`);
    }

    // Validate & standardize property_type
    const propertyType = standardizePropertyType(raw.property_type);
    if (!propertyType.valid) {
        errors.push(`Invalid property_type: "${raw.property_type}" (must be "sale" or "rental")`);
    }

    // Validate & standardize preferred_property_type
    const preferredPropertyType = standardizePreferredPropertyType(raw.preferred_property_type);
    if (!preferredPropertyType.valid) {
        errors.push(
            `Invalid preferred_property_type: "${raw.preferred_property_type}" (must be apartment, house, condo, or townhouse)`
        );
    }

    // Validate & parse budget
    const budget = parseBudget(raw.budget);
    if (!budget.valid) {
        errors.push(`Invalid budget: "${raw.budget}" (must be a positive number)`);
    }

    // Validate location
    const location = standardizeLocation(raw.location);
    if (!location) {
        errors.push("Location is missing or empty");
    }

    // Validate contact_date
    if (!isValidDate(raw.contact_date)) {
        errors.push(`Invalid contact_date: "${raw.contact_date}"`);
    }

    // Build the cleaned Lead object
    const lead: Lead = {
        lead_id: raw.lead_id,
        name: name,
        phone: phone,
        email: email,
        property_type: propertyType.value,
        budget: budget.value,
        location: location,
        preferred_property_type: preferredPropertyType.value,
        contact_date: raw.contact_date,
        inquiry_notes: raw.inquiry_notes || "",
        is_valid: errors.length === 0,
        validation_errors: errors,
    };

    return lead;
}
