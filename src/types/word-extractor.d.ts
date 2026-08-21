declare module "word-extractor" {
  class Document {
    getBody(): string
    getFootnotes(): string
    getEndnotes(): string
    getHeaders(options?: unknown): string
  }

  export default class WordExtractor {
    extract(input: string | Buffer): Promise<Document>
  }
}
