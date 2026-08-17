import { Injectable, Logger, NotFoundException, type OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { bibleBooks } from "@sbr/bible-data";
import type { Language } from "@sbr/shared-types";
import { BibleBook, type BibleBookDocument } from "./schemas/bible-book.schema";

export interface BibleBookView {
  code: string;
  name: string;
  testament: string;
  category: string;
  chapterCount: number;
  canonicalOrder: number;
}

/** Langues dont bible_books.names porte réellement une traduction en phase 1. */
const NAMED_LANGUAGES = ["fr", "en", "es", "de"] as const;
type NamedLanguage = (typeof NAMED_LANGUAGES)[number];

@Injectable()
export class BibleService implements OnModuleInit {
  private readonly logger = new Logger(BibleService.name);

  constructor(@InjectModel(BibleBook.name) private readonly bookModel: Model<BibleBookDocument>) {}

  async onModuleInit(): Promise<void> {
    const count = await this.bookModel.estimatedDocumentCount();
    if (count === 0) {
      this.logger.log("Collection bible_books vide — amorçage des 66 livres…");
      await this.seed();
    }
  }

  /** Idempotent : peut être rejoué sans dupliquer ni écraser d'ordre. */
  async seed(): Promise<number> {
    const ops = bibleBooks.map((book) => ({
      updateOne: {
        filter: { code: book.code },
        update: { $set: book },
        upsert: true,
      },
    }));
    await this.bookModel.bulkWrite(ops);
    return ops.length;
  }

  async findAll(lang: Language): Promise<BibleBookView[]> {
    const books = await this.bookModel.find().sort({ canonicalOrder: 1 });
    return books.map((b) => this.toView(b, lang));
  }

  async findByCode(code: string, lang: Language): Promise<BibleBookView> {
    const book = await this.bookModel.findOne({ code: code.toUpperCase() });
    if (!book) throw new NotFoundException(`Livre inconnu : ${code}`);
    return this.toView(book, lang);
  }

  private toView(book: BibleBookDocument, lang: Language): BibleBookView {
    const namedLang: NamedLanguage = (NAMED_LANGUAGES as readonly string[]).includes(lang)
      ? (lang as NamedLanguage)
      : "en"; // repli tant que ar/bas n'ont pas de traduction de contenu (§07)
    return {
      code: book.code,
      name: book.names[namedLang],
      testament: book.testament,
      category: book.category,
      chapterCount: book.chapterCount,
      canonicalOrder: book.canonicalOrder,
    };
  }
}
