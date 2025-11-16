import { Contact } from "../model/contact.model";
import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from "../../environments/environment";

@Injectable({ providedIn: "root" })
export class ContactService {

    private endpoint = environment.contactEndpoint;

    constructor(private http: HttpClient) { }

    createContact(contact: Contact): Promise<any> {
        const params = new URLSearchParams();
        params.append("name", contact.name ?? "");
        params.append("email", contact.email ?? "");
        params.append("message", contact.message ?? "");

        const headers = new HttpHeaders({
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        });

        return this.http.post(this.endpoint, params.toString(), {
            headers,
            responseType: "text"
        }).toPromise()
            .then(() => ({ success: true }))
            .catch(error => {
                const status = typeof error?.status === "number" ? error.status : undefined;
                if (status === 0 || (status && status >= 300 && status < 400)) {
                    return { success: true };
                }
                throw error;
            });
    }
}
