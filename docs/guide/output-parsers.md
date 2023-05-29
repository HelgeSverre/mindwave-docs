# Output Parsers

todo write this

## Available OutputParsers:

Mindwave currently offers several Output Parsers:

-   `CommaSeparatedListOutputParser` - Turns CSV-like text into a PHP array
-   `JsonListOutputParser` - Converts a Json list responses into a PHP array
-   `JsonOutputParser` - Converts Json responses into a PHP array
-   `StructuredOutputParser` - Accepts a php class as input, generates a JSON schema and tries to convert the response
    back into an instance of the original class (You could call it a DTO mapper)
-   `TextOutputParser` - Provides not formatting instruction and simply returns the input text back verbatim, this is the
    default OutputParser.
