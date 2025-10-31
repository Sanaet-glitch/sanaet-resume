import { Contact } from "../model/contact.model";
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

@Injectable({ providedIn: "root" })
export class ContactService {

    private pageclipUrl = "https://send.pageclip.co/8S1Y604Hog9FmUFhdElsaml3QKncKI8F";

    constructor(private http: HttpClient) { }

    createContact(contact: Contact): Promise<any> {
        // Pageclip expects the data to be sent with all form fields
        const formData = {
            name: contact.name,
            email: contact.email,
            message: contact.message
        };
        
        return firstValueFrom(this.http.post(this.pageclipUrl, formData));
    }
}
