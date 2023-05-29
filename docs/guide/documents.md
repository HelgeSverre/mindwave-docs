# Documents

todo write this

Document Consumption involves breaking down the underlying text representation of a piece of data into smaller
parts, creating an embedding vector for the data, then storing both the data and embedding in a vector database.

```php
DocumentLoader::fromPdf(
    data: File::get("uploads/important-document.pdf"),
    meta: ["name" => "Important document"],
);

DocumentLoader::fromUrl(
    data: "https://mindwave.no/",
    meta: ["name" => "Mindwave Documentation"],
);

DocumentLoader::make("My name is Helge Sverre");
```

### Supported filetypes

Mindwave can create knowledge from the following filetypes.

-   Plain Text (csv, markdown, etc)
-   PDF
-   HTML
-   doc, docx (Word documents)

With planned support for the following formats in the future:

-   ppt, pptx (Powerpoint files)
-   xls, xlsx (Excel files)
-   EML files (raw email)
-   MBOX (mailbox file, ex: export from gmail)
