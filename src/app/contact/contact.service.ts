import { Contact } from "../model/contact.model";
import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { environment } from "../../environments/environment";

interface ContactApiResponse {
    success?: boolean;
    error?: string;
}

@Injectable({ providedIn: "root" })
export class ContactService {

    private endpoint = environment.contactEndpoint;

    constructor(private http: HttpClient) { }

    async createContact(contact: Contact): Promise<void> {
        const payload = {
            name: contact.name ?? "",
            email: contact.email ?? "",
            message: contact.message ?? ""
        };

        const headers = new HttpHeaders({
            "Accept": "application/json"
        });

        try {
            const response = await this.http.post<ContactApiResponse>(this.endpoint, payload, { headers }).toPromise();
            if (!response?.success) {
                throw new Error(response?.error || "Unexpected response from contact service.");
            }
        } catch (error) {
            throw this.normalizeError(error);
        }
    }

    private normalizeError(error: unknown): Error {
        if (error instanceof HttpErrorResponse) {
            if (error.error) {
                if (typeof error.error === "string") {
                    return new Error(error.error);
                }
                if (typeof error.error === "object" && typeof error.error.error === "string") {
                    return new Error(error.error.error);
                }
            }
            if (error.message) {
                return new Error(error.message);
            }
        }

        if (error instanceof Error) {
            return error;
        }

        return new Error("Unable to send your message right now. Please try again later.");
    }
}
