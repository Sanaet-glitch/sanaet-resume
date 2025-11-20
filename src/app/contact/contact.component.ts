import { Component, OnInit } from "@angular/core";
import {
  faEnvelope, faPhone, faTimes,
  faMapMarkerAlt, IconDefinition
} from "@fortawesome/free-solid-svg-icons";
import { UntypedFormGroup, UntypedFormControl, Validators } from "@angular/forms";
import { ContactService } from "./contact.service";
import { Contact } from "../model/contact.model";
import { environment } from '../../environments/environment';

@Component({
  selector: "app-contact",
  templateUrl: "./contact.component.html",
  styleUrls: ["./contact.component.scss", "./contact.component.responsivity.scss"]
})

export class ContactComponent implements OnInit {

  name: string;
  email: string;
  phone: string;
  location: string;

  faEnvelope: IconDefinition;
  faPhone: IconDefinition;
  faMapMarkerAlt: IconDefinition;
  faTimes: IconDefinition;

  isLoading: boolean = false;
  hasBeenSubmited: boolean = false;
  feedbackStatus: string;
  feedbackDetails: string = "";

  constructor(private contactService: ContactService) { }

  contactForm: UntypedFormGroup = new UntypedFormGroup({
    name: new UntypedFormControl("",[
      Validators.required,
      Validators.pattern("[A-zÀ-ú ]*")
    ]),
    email: new UntypedFormControl("",[
      Validators.required,
      Validators.pattern("^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$")
    ]),
    message: new UntypedFormControl("",[
      Validators.required
    ])
  });

  get senderEmail() {
    return this.contactForm.get("email")
  }

  get senderName() {
    return this.contactForm.get("name")
  }

  get senderMessage() {
    return this.contactForm.get("message")
  }

  get options() {
    return this.contactForm.get("options")
  }

  ngOnInit(): void {
    const personalData = environment.personal;
    this.name = personalData.name;
    this.email = personalData.email;
    this.phone = personalData.phone;
    this.location = personalData.location;

    this.faEnvelope = faEnvelope;
    this.faPhone = faPhone;
    this.faMapMarkerAlt = faMapMarkerAlt;
    this.faTimes = faTimes;
  }

  saveContact(contact: Contact) {
    this.contactService.createContact(contact)
      .then(() => this.displayUserInterfaceMessage(true))
      .catch(error => this.displayUserInterfaceMessage(false, this.resolveErrorMessage(error)));
  }

  displayUserInterfaceMessage(hasBeenSuccessfuly: boolean, details?: string) {
    this.isLoading = false;
    this.feedbackStatus = hasBeenSuccessfuly ? "success" : "error";
    this.feedbackDetails = hasBeenSuccessfuly ? "" : (details || "");

    if (hasBeenSuccessfuly) {
      this.contactForm.reset();
    }
  }

  closeFeedbackMessage() {
    this.hasBeenSubmited = false;
    this.feedbackStatus = "";
    this.feedbackDetails = "";
  }

  onSubmit(contactForm) {
    this.isLoading = true;
    this.hasBeenSubmited = true;
    this.feedbackStatus = "pending";
    this.feedbackDetails = "";

    const contactValues: Contact = {
      name: this.senderName.value,
      email: this.senderEmail.value,
      message: this.senderMessage.value,
      date: new Date()
    } as Contact;

    this.saveContact(contactValues);
  }

  private resolveErrorMessage(error: unknown): string {
    if (!error) {
      return "";
    }

    if (typeof error === "string") {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
      return (error as any).message;
    }

    return "";
  }
}
