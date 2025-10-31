import { Contact } from "../model/contact.model";
import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";

@Injectable({ providedIn: "root" })
export class ContactService {

    private pageclipUrl = "https://send.pageclip.co/8S1Y604Hog9FmUFhdElsaml3QKncKI8F";

    constructor(private http: HttpClient) { }

    createContact(contact: Contact): Promise<any> {
        // Prepare data object for Pageclip
        const data = {
            name: contact.name,
            email: contact.email,
            message: contact.message
        };
        
        // Add Accept: application/json header to get 200 OK instead of 302 redirect
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });
        
        // Pageclip may return a 302 redirect which HttpClient treats as success
        // We need to handle both success and "redirect error" as success
        return this.http.post(this.pageclipUrl, data, { headers })
            .toPromise()
            .catch((error) => {
                // If it's a 302 redirect or CORS-related, treat it as success
                // Pageclip redirects on success, which appears as an error in Angular
                if (error.status === 0 || error.status === 302) {
                    return Promise.resolve({ success: true });
                }
                // For other errors, reject
                return Promise.reject(error);
            });
    }
}
