import { Component, OnInit } from "@angular/core";
import { Meta, Title } from "@angular/platform-browser";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"]
})
export class AppComponent implements OnInit {

  title: string = "Live Resume - Sanaet Sankui";

  constructor(
    private titleService: Title,
    private metaTagService: Meta
  ) { }

  ngOnInit(): void {

    this.titleService.setTitle(this.title);

    this.metaTagService.addTags([
      { name: "keywords", content: "Web Developer, Full-stack Engineer, Cloud Engineer, Sanaet Sankui Live Resume, Sanaet Sankui Resume, Sanaet Sankui CV, sanaet.tech" },
      { name: "robots", content: "index, follow" },
      { name: "author", content: "Sanaet Sankui" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "date", content: "2020-05-12", scheme: "YYYY-MM-DD" },
      { charset: "UTF-8" }
    ]);

    this.metaTagService.updateTag(
      { name: "description", content: "Hello, I'm Sanaet Sankui, a cloud-focused full-stack engineer building delightful web and mobile experiences. Find out more in my live resume!" }
    );
  }
}
