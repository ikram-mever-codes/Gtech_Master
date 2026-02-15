import { api, handleApiError } from "@/utils/api";
import { loadingStyles, successStyles } from "@/utils/constants";
import { ResponseInterface } from "@/utils/interfaces";
import toast from "react-hot-toast";

export type Sex = "male" | "female" | "";

export type Position =
  | "Einkauf"
  | "Entwickler"
  | "Produktionsleiter"
  | "Betriebsleiter"
  | "Geschäftsführer"
  | "Owner"
  | "Others"
  | "";

export type LinkedInState =
  | "open"
  | "NoLinkedIn"
  | "Vernetzung geschickt"
  | "Linked angenommen"
  | "Erstkontakt"
  | "im Gespräch"
  | "NichtAnsprechpartner";

export type ContactType =
  | "User"
  | "Purchaser"
  | "Influencer"
  | "Gatekeeper"
  | "DecisionMaker technical"
  | "DecisionMaker financial"
  | "real DecisionMaker"
  | "";

export type DecisionMakerState =
  | ""
  | "open"
  | "ErstEmail"
  | "Folgetelefonat"
  | "2.Email"
  | "Anfragtelefonat"
  | "weiteres Serienteil"
  | "kein Interesse";

// Data Types
export type ContactPersonData = {
  id: string;
  sex: Sex;
  starBusinessDetailsId: string;
  businessName?: string;
  businessId?: string;
  name: string;
  familyName: string;
  fullName: string;
  position: Position;
  businessLegalName?: string;
  isDecisionMaker: boolean;
  decisionMakerState?: DecisionMakerState;
  positionOthers?: string;
  displayPosition?: string;
  email?: string;
  phone?: string;
  linkedInLink?: string;
  noteContactPreference?: string;
  stateLinkedIn: LinkedInState;
  contact: ContactType;
  note?: string;
  decisionMakerNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateContactPersonPayload = {
  sex?: Sex;
  starBusinessDetailsId: string;
  name: string;
  familyName: string;
  position?: Position;
  positionOthers?: string;
  email?: string;
  phone?: string;
  linkedInLink?: string;
  noteContactPreference?: string;
  stateLinkedIn?: LinkedInState;
  contact?: ContactType;
  decisionMakerState?: DecisionMakerState;
  note?: string;
  decisionMakerNote?: string;
};

export type UpdateContactPersonPayload = {
  sex?: Sex;
  name?: string;
  familyName?: string;
  position?: Position;
  positionOthers?: string;
  email?: string;
  phone?: string;
  linkedInLink?: string;
  noteContactPreference?: string;
  stateLinkedIn?: LinkedInState;
  contact?: ContactType;
  decisionMakerState?: DecisionMakerState;
  note?: string;
  decisionMakerNote?: string;
};

export type ContactPersonFilters = {
  page?: number;
  limit?: number;
  search?: string;
  businessName?: string;
  companyId?: string;
  starBusinessDetailsId?: string;
  position?: Position;
  sex?: Sex;
  isDecisionMaker: boolean;
  stateLinkedIn?: LinkedInState;
  contact?: ContactType;
  hasEmail?: string;
  hasPhone?: string;
  hasLinkedIn?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
};

export type BulkImportPayload = {
  contactPersons: Partial<CreateContactPersonPayload>[];
  starBusinessDetailsId: string;
};

export type ContactPersonStatistics = {
  total: number;
  byPosition: Array<{ position: string; count: number }>;
  byLinkedInState: Array<{ stateLinkedIn: string; count: number }>;
  byContactType: Array<{ contact: string; count: number }>;
  bySex: Array<{ sex: string; count: number }>;
  contactInfo: {
    withEmail: number;
    withPhone: number;
    withLinkedIn: number;
  };
};

export const createContactPerson = async (
  payload: CreateContactPersonPayload
) => {
  try {
    toast.loading("Creating contact person...", loadingStyles);
    const res: ResponseInterface = await api.post("/contacts", payload);
    toast.dismiss();
    toast.success(
      res.message || "Contact person created successfully",
      successStyles
    );
    return res;
  } catch (error) {
    toast.dismiss();
    handleApiError(error);
  }
};

export const updateContactPerson = async (
  contactPersonId: string,
  payload: UpdateContactPersonPayload
) => {
  try {
    toast.loading("Updating contact person...", loadingStyles);
    const res: ResponseInterface = await api.put(
      `/contacts/${contactPersonId}`,
      payload
    );
    toast.dismiss();
    toast.success(
      res.message || "Contact person updated successfully",
      successStyles
    );
    return res;
  } catch (error) {
    toast.dismiss();
    handleApiError(error);
  }
};

export const getSingleContactPerson = async (contactPersonId: string) => {
  try {
    const res: ResponseInterface = await api.get(
      `/contacts/${contactPersonId}`
    );
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

export const getAllContactPersons = async (filters?: any) => {
  try {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    const res: ResponseInterface = await api.get(
      `/contacts${params.toString() ? `?${params.toString()}` : ""}`
    );
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

// Get contact persons by star business
export const getContactPersonsByStarBusiness = async (
  starBusinessDetailsId: string
) => {
  try {
    const res: ResponseInterface = await api.get(
      `/contacts/star-business/${starBusinessDetailsId}`
    );
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

// Delete single contact person
export const deleteContactPerson = async (contactPersonId: string) => {
  try {
    toast.loading("Deleting contact person...", loadingStyles);
    const res: ResponseInterface = await api.delete(
      `/contacts/${contactPersonId}`
    );
    toast.dismiss();
    toast.success(
      res.message || "Contact person deleted successfully",
      successStyles
    );
    return res;
  } catch (error) {
    toast.dismiss();
    handleApiError(error);
  }
};

// Bulk delete contact persons
export const bulkDeleteContactPersons = async (ids: string[]) => {
  try {
    toast.loading("Deleting contact persons...", loadingStyles);
    const res: ResponseInterface = await api.post("/contacts/bulk-delete", {
      ids,
    });
    toast.dismiss();
    toast.success(
      res.message || `Successfully deleted ${ids.length} contact persons`,
      successStyles
    );
    return res;
  } catch (error) {
    toast.dismiss();
    handleApiError(error);
  }
};

// Bulk import contact persons
export const bulkImportContactPersons = async (payload: BulkImportPayload) => {
  try {
    toast.loading("Importing contact persons...", loadingStyles);
    const res: ResponseInterface = await api.post(
      "/contacts/bulk-import",
      payload
    );
    toast.dismiss();

    const data = res.data as any;
    const message = `Imported ${data?.imported || 0} of ${data?.total || 0
      } contact persons`;

    if (data?.duplicates > 0) {
      toast.success(
        `${message} (${data.duplicates} duplicates skipped)`,
        successStyles
      );
    } else {
      toast.success(message, successStyles);
    }

    return res;
  } catch (error) {
    toast.dismiss();
    handleApiError(error);
  }
};

// Bulk update LinkedIn state
export const bulkUpdateLinkedInState = async (
  ids: string[],
  stateLinkedIn: LinkedInState
) => {
  try {
    toast.loading("Updating LinkedIn states...", loadingStyles);
    const res: ResponseInterface = await api.post(
      "/contacts/bulk-update-linkedin-state",
      { ids, stateLinkedIn }
    );
    toast.dismiss();

    const data = res.data as any;
    toast.success(
      `Updated LinkedIn state for ${data?.updatedCount || ids.length
      } contact persons`,
      successStyles
    );
    return res;
  } catch (error) {
    toast.dismiss();
    handleApiError(error);
  }
};

// Get contact person statistics
export const getContactPersonStatistics = async (
  starBusinessDetailsId?: string
) => {
  try {
    const params = starBusinessDetailsId
      ? `?starBusinessDetailsId=${starBusinessDetailsId}`
      : "";
    const res: ResponseInterface = await api.get(
      `/contacts/statistics${params}`
    );
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

// Export contact persons to CSV
export const exportContactPersonsToCSV = async (filters?: {
  starBusinessDetailsId?: string;
  ids?: string[];
  search?: string;
  position?: Position;
  sex?: Sex;
  stateLinkedIn?: LinkedInState;
  contact?: ContactType;
}) => {
  try {
    toast.loading("Exporting contact persons...", loadingStyles);

    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === "ids" && Array.isArray(value)) {
            params.append(key, value.join(","));
          } else if (value !== "") {
            params.append(key, String(value));
          }
        }
      });
    }

    const res: ResponseInterface = await api.get(
      `/contacts/export${params.toString() ? `?${params.toString()}` : ""}`
    );

    toast.dismiss();

    // Download the CSV file
    if (res.data && Array.isArray(res.data)) {
      downloadCSV(res.data, "contact_persons_export");
      toast.success("Contact persons exported successfully", successStyles);
    }

    return res;
  } catch (error) {
    toast.dismiss();
    handleApiError(error);
  }
};

// Update LinkedIn state for single contact
export const updateContactLinkedInState = async (
  contactPersonId: string,
  stateLinkedIn: LinkedInState
) => {
  try {
    toast.loading("Updating LinkedIn state...", loadingStyles);
    const res: ResponseInterface = await api.put(
      `/contacts/${contactPersonId}`,
      { stateLinkedIn }
    );
    toast.dismiss();
    toast.success("LinkedIn state updated successfully", successStyles);
    return res;
  } catch (error) {
    toast.dismiss();
    handleApiError(error);
  }
};

// Update contact type for single contact
export const updateContactType = async (
  contactPersonId: string,
  contact: ContactType
) => {
  try {
    toast.loading("Updating contact type...", loadingStyles);
    const res: ResponseInterface = await api.put(
      `/contacts/${contactPersonId}`,
      { contact }
    );
    toast.dismiss();
    toast.success("Contact type updated successfully", successStyles);
    return res;
  } catch (error) {
    toast.dismiss();
    handleApiError(error);
  }
};

// Search contact persons
export const searchContactPersons = async (searchTerm: string) => {
  try {
    const res: ResponseInterface = await api.get(
      `/contacts?search=${encodeURIComponent(searchTerm)}`
    );
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

// Utility function to download CSV
const downloadCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    toast.error("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape commas and quotes in values
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? "";
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${timestamp}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Constants for dropdowns and selects
export const LINKEDIN_STATES = [
  { value: "open", label: "Open" },
  { value: "NoLinkedIn", label: "No LinkedIn" },
  { value: "Vernetzung geschickt", label: "Connection Request Sent" },
  { value: "Linked angenommen", label: "Connection Accepted" },
  { value: "Erstkontakt", label: "First Contact" },
  { value: "im Gespräch", label: "In Discussion" },
  { value: "NichtAnsprechpartner", label: "Not a Contact Person" },
] as const;

export const CONTACT_TYPES = [
  { value: "", label: "Not Specified" },
  { value: "User", label: "User" },
  { value: "Purchaser", label: "Purchaser" },
  { value: "Influencer", label: "Influencer" },
  { value: "Gatekeeper", label: "Gatekeeper" },
  { value: "DecisionMaker technical", label: "Technical Decision Maker" },
  { value: "DecisionMaker financial", label: "Financial Decision Maker" },
  { value: "real DecisionMaker", label: "Real Decision Maker" },
] as const;

export const POSITIONS = [
  { value: "", label: "Not Specified" },
  { value: "Einkauf", label: "Einkauf" },
  { value: "Entwickler", label: "Entwickler" },
  { value: "Produktionsleiter", label: "Produktionsleiter" },
  { value: "Betriebsleiter", label: "Betriebsleiter" },
  { value: "Geschäftsführer", label: "Geschäftsführer" },
  { value: "Owner", label: "Owner" },
  { value: "Others", label: "Others" },
] as const;

export const SEX_OPTIONS = [
  { value: "Not Specified", label: "Not Specified" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

export const DECISION_MAKER_STATES = [
  { value: "", label: "No State" },
  { value: "open", label: "Open" },
  { value: "ErstEmail", label: "Erst Email" },
  { value: "Folgetelefonat", label: "Folgetelefonat" },
  { value: "2.Email", label: "2. Email" },
  { value: "Anfragtelefonat", label: "Anfragtelefonat" },
  { value: "weiteres Serienteil", label: "Weiteres Serienteil" },
  { value: "kein Interesse", label: "Kein Interesse" },
] as const;
// Helper function to get display labels
export const getLinkedInStateLabel = (state: LinkedInState): string => {
  const found = LINKEDIN_STATES.find((s) => s.value === state);
  return found?.label || state;
};

export const getContactTypeLabel = (type: ContactType): string => {
  const found = CONTACT_TYPES.find((t) => t.value === type);
  return found?.label || type;
};

export const getPositionLabel = (position: Position): string => {
  const found = POSITIONS.find((p) => p.value === position);
  return found?.label || position;
};

export const getSexLabel = (sex: Sex): string => {
  const found = SEX_OPTIONS.find((s) => s.value === sex);
  return found?.label || "Not Specified";
};

// Additional API functions for contactPersonApiFunctions.ts
// Add these to your existing contactPersonApiFunctions.ts file

// Type definitions for Star Businesses
export type StarBusinessData = {
  id: string;
  customerId: string;
  companyName: string;
  legalName?: string;
  email?: string;
  contactEmail?: string;
  contactPhoneNumber?: string;
  website?: string;
  city?: string;
  country?: string;
  address?: string;
  postalCode?: string;
  industry?: string;
  inSeries?: "Yes" | "No";
  madeIn?: "Yes" | "No";
  device?: string;
  lastChecked?: string;
  checkedBy?: "manual" | "AI";
  comment?: string;
  contactPersonsCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type StarBusinessWithoutContactData = StarBusinessData & {
  needsContactPerson: true;
  daysSinceConverted?: number;
};

export type StarBusinessFilters = {
  search?: string;
  page?: number;
  limit?: number;
  city?: string;
  country?: string;
  industry?: string;
  withContactsCount?: boolean;
};

export type QuickAddContactPayload = {
  name: string;
  familyName: string;
  email?: string;
  phone?: string;
  position?: Position;
};

export type ContactSummaryResponse = {
  summary: {
    totalStarBusinesses: number;
    withContacts: number;
    withoutContacts: number;
    percentageWithContacts: string;
    averageContactsPerBusiness: string;
  };
  groupedByContactCount: Record<number, StarBusinessData[]>;
  businesses: StarBusinessData[];
};

// Get all star businesses (for dropdown selection in create contact form)
export const getAllStarBusinesses = async (filters?: StarBusinessFilters) => {
  try {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    // Default to include contact counts
    if (!params.has("withContactsCount")) {
      params.append("withContactsCount", "true");
    }

    const res: ResponseInterface = await api.get(
      `/contacts/star-businesses/all${params.toString() ? `?${params.toString()}` : ""
      }`
    );
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

// Get star businesses without any contact persons
export const getStarBusinessesWithoutContacts = async (
  filters?: StarBusinessFilters
) => {
  try {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    const res: ResponseInterface = await api.get(
      `/contacts/star-businesses/without-contacts${params.toString() ? `?${params.toString()}` : ""
      }`
    );
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

// Get star businesses with contact summary statistics
export const getStarBusinessesContactSummary = async (
  minContacts?: number,
  maxContacts?: number
) => {
  try {
    const params = new URLSearchParams();

    if (minContacts !== undefined) {
      params.append("minContacts", String(minContacts));
    }
    if (maxContacts !== undefined) {
      params.append("maxContacts", String(maxContacts));
    }

    const res: ResponseInterface = await api.get(
      `/contacts/star-businesses/contact-summary${params.toString() ? `?${params.toString()}` : ""
      }`
    );
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

// Quick add contact person to a star business
export const quickAddContactPerson = async (
  starBusinessDetailsId: string,
  payload: QuickAddContactPayload
) => {
  try {
    toast.loading("Adding contact person...", loadingStyles);
    const res: ResponseInterface = await api.post(
      `/contacts/star-businesses/${starBusinessDetailsId}/quick-add`,
      payload
    );
    toast.dismiss();
    toast.success(
      res.message || "Contact person added successfully",
      successStyles
    );
    return res;
  } catch (error) {
    toast.dismiss();
    handleApiError(error);
  }
};

// Fetch star businesses for dropdown (simplified version)
export const fetchStarBusinessesForDropdown = async (search?: string) => {
  try {
    const params = new URLSearchParams();
    if (search) {
      params.append("search", search);
    }
    params.append("limit", "100"); // Get more results for dropdown
    params.append("withContactsCount", "false"); // Don't need counts for dropdown

    const res: ResponseInterface = await api.get(
      `/contacts/star-businesses/all?${params.toString()}`
    );

    if (res?.data?.starBusinesses) {
      // Format for dropdown use
      return res.data.starBusinesses.map((business: StarBusinessData) => ({
        value: business.id,
        label: business.companyName,
        description: `${business.city || ""}${business.city && business.country ? ", " : ""
          }${business.country || ""}`,
        email: business.email,
        contactEmail: business.contactEmail,
      }));
    }

    return [];
  } catch (error) {
    console.error("Error fetching star businesses for dropdown:", error);
    return [];
  }
};

// Bulk assign contact persons to star businesses without contacts
export const bulkAssignContactsToBusinesses = async (
  assignments: Array<{
    starBusinessDetailsId: string;
    contactData: QuickAddContactPayload;
  }>
) => {
  try {
    toast.loading(
      `Assigning ${assignments.length} contact persons...`,
      loadingStyles
    );

    const results = await Promise.allSettled(
      assignments.map(({ starBusinessDetailsId, contactData }) =>
        api.post(
          `/contacts/star-businesses/${starBusinessDetailsId}/quick-add`,
          contactData
        )
      )
    );

    toast.dismiss();

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (successful > 0 && failed === 0) {
      toast.success(
        `Successfully assigned ${successful} contact persons`,
        successStyles
      );
    } else if (successful > 0 && failed > 0) {
      toast.success(
        `Assigned ${successful} contacts (${failed} failed)`,
        successStyles
      );
    } else {
      toast.error(`Failed to assign contact persons`);
    }

    return {
      successful,
      failed,
      results,
    };
  } catch (error) {
    toast.dismiss();
    handleApiError(error);
  }
};

// Get star business details with contact persons
export const getStarBusinessWithContacts = async (
  starBusinessDetailsId: string
) => {
  try {
    // Get business details
    const businessRes = await api.get(`/contacts/star-businesses/all?limit=1`);

    // Get contact persons for this business
    const contactsRes = await api.get(
      `/contacts/star-business/${starBusinessDetailsId}`
    );

    if (businessRes?.data && contactsRes?.data) {
      const business = businessRes.data.starBusinesses?.find(
        (b: StarBusinessData) => b.id === starBusinessDetailsId
      );

      return {
        business,
        contacts: contactsRes.data,
      };
    }

    return null;
  } catch (error) {
    handleApiError(error);
  }
};

// Check if a star business has any contact persons
export const checkBusinessHasContacts = async (
  starBusinessDetailsId: string
) => {
  try {
    const res = await api.get(
      `/contacts/star-business/${starBusinessDetailsId}`
    );

    return {
      hasContacts: res?.data?.length > 0,
      contactCount: res?.data?.length || 0,
      contacts: res?.data || [],
    };
  } catch (error) {
    console.error("Error checking business contacts:", error);
    return {
      hasContacts: false,
      contactCount: 0,
      contacts: [],
    };
  }
};

// Helper function to format star business for display
export const formatStarBusinessDisplay = (
  business: StarBusinessData
): string => {
  const parts = [business.companyName];

  if (business.city) parts.push(business.city);
  if (business.country) parts.push(business.country);

  if (business.contactPersonsCount !== undefined) {
    parts.push(`(${business.contactPersonsCount} contacts)`);
  }

  return parts.join(" - ");
};

// Constants for star business filters
export const STAR_BUSINESS_INDUSTRIES = [
  { value: "", label: "All Industries" },
  { value: "Technology", label: "Technology" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Finance", label: "Finance" },
  { value: "Retail", label: "Retail" },
  { value: "Services", label: "Services" },
  { value: "Others", label: "Others" },
] as const;

export const IN_SERIES_OPTIONS = [
  { value: "", label: "All" },
  { value: "Yes", label: "In Series" },
  { value: "No", label: "Not In Series" },
] as const;

export const MADE_IN_OPTIONS = [
  { value: "", label: "All" },
  { value: "Yes", label: "Made In-House" },
  { value: "No", label: "Outsourced" },
] as const;
