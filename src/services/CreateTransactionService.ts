// import AppError from '../errors/AppError';

import { getRepository, getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}
class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const categoryRepository = getRepository(Category);

    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome' && balance.total < value) {
      throw new AppError('Your balance is less than the outcome value');
    }

    const categoryFound = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    let newCategory = {} as Category;
    if (!categoryFound) {
      newCategory = categoryRepository.create({
        title: category,
      });
      await categoryRepository.save(newCategory);
    } else {
      newCategory = categoryFound;
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: newCategory.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;

    // TODO
  }
}

export default CreateTransactionService;
