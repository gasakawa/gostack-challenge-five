import { getCustomRepository, In, getRepository } from 'typeorm';
import path from 'path';
import parse from 'csv-parse/lib/sync';
import fs from 'fs';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface CSVRequest {
  type: 'income' | 'outcome';
  value: number;
  title: string;
  category: string;
}
class ImportTransactionsService {
  async execute(csvFilename: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    const csvFilePath = path.join(uploadConfig.directory, csvFilename);
    const transactionsFile = parse(await fs.promises.readFile(csvFilePath), {
      skip_empty_lines: true,
      columns: true,
      trim: true,
    }) as CSVRequest[];

    const categories = transactionsFile.map(
      transaction => transaction.category,
    );

    const existenCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existenCategoriesTitle = existenCategories.map(
      existedCategory => existedCategory.title,
    );

    const categoriesTitles = categories
      .map(title => title)
      .filter(cat => !existenCategoriesTitle.includes(cat));

    const addCategories = Array.from(new Set(categoriesTitles));

    const newCategories = categoryRepository.create(
      addCategories.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const categoriesToSave = [...newCategories, ...existenCategories];

    const transactions = transactionsRepository.create(
      transactionsFile.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category: categoriesToSave.find(
          cat => cat.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(transactions);

    await fs.promises.unlink(csvFilePath);

    return transactions;
  }
}

export default ImportTransactionsService;
