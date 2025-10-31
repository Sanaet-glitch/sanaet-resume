import { Contact } from "../model/contact.model";
import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";

@Injectable({ providedIn: "root" })
export class ContactService {

    private pageclipUrl = "https://send.pageclip.co/8S1Y604Hog9FmUFhdElsaml3QKncKI8F";

    constructor(private http: HttpClient) { }

    createContact(contact: Contact): Promise<any> {
        // Pageclip expects form-encoded data
        const formData = new URLSearchParams();
        formData.append('name', contact.name);
        formData.append('email', contact.email);
        formData.append('message', contact.message);
        
        // Add Accept: application/json header to get 200 OK instead of 302 redirect
        const headers = new HttpHeaders({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        });
        
        return this.http.post(this.pageclipUrl, formData.toString(), { headers }).toPromise();
    }
}
