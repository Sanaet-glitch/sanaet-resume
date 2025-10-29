import { Directive, ElementRef, Input, OnInit} from "@angular/core";
import { LOCALE_ID, Inject } from "@angular/core";
import { EllipsisPipe } from "../pipe/ellipsis.pipe";

@Directive({ selector: "[appInternationalization]" })
export class InternationalizationDirective {

    private _data: any[] = [];

    @Input() property :string;

    @Input() get data(): any[] {
        return this._data;
    }

    @Input() ellipsis :number;

    constructor(
        private el: ElementRef,
        @Inject(LOCALE_ID) public locale: string
    ) {}

    set data(value: any[]) {
        if(value) {
            this._data = value;
            this.el.nativeElement.innerHTML = this.retrievePropertyValueByLocation();
        }
    }

    private retrievePropertyValueByLocation(): any {

        if(this._data) {

            // Normalize locale (e.g. 'en-US' -> 'en') so JSON language keys like 'en' or 'pt' match.
            const normalizedLocale = (this.locale || "en").toString().split("-")[0];

            const value: string[] = this._data
                .filter(element => element.language === normalizedLocale)
                .map(element => element[this.property]) || [""];

            // If ellipsis is provided, return truncated string; otherwise return the string itself (not an array).
            if (this.ellipsis > 0) {
                return new EllipsisPipe().transform(value[0], this.ellipsis);
            }

            return value[0] || "";

        }
    }
}
