export interface IPost {
    thumbnail: string
    http: string;
    date: string; // For the purpose of stringifying MM-DD-YYYY date format
    internationalizations: IPostInternationalization[];
    descriptionEllipsis?: number;
    descriptionClass?: string;
}

export interface IPostInternationalization {
    language: string;
    title: string;
    description: string;
}