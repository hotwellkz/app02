import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { CategoryData, CategoryCardType } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyAICwewb9nIfENQH-gOJgkpQXZKBity9ck",
  authDomain: "accounting-c3c06.firebaseapp.com",
  projectId: "accounting-c3c06",
  storageBucket: "accounting-c3c06.firebasestorage.app",
  messagingSenderId: "670119019137",
  appId: "1:670119019137:web:f5c57a1a6f5ef05c720380"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Вспомогательная функция для форматирования суммы
const formatAmount = (amount: number): string => {
  return `${amount} ₸`;
};

// Вспомогательная функция для парсинга суммы из строки
const parseAmount = (amountStr: string): number => {
  return parseFloat(amountStr.replace(/[^\d.-]/g, ''));
};

export const addCategory = async (categoryData: CategoryData) => {
  try {
    const docRef = await addDoc(collection(db, 'categories'), {
      ...categoryData,
      amount: '0 ₸',
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const updateCategory = async (categoryId: string, data: any) => {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategory = async (categoryId: string, categoryTitle: string, deleteAll: boolean) => {
  const batch = writeBatch(db);

  try {
    if (deleteAll) {
      // Удаляем все связанные транзакции
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('categoryId', '==', categoryId)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      transactionsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Удаляем все связанные категории
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('title', '==', categoryTitle)
      );
      const categoriesSnapshot = await getDocs(categoriesQuery);
      categoriesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } else {
      // Удаляем только текущую категорию
      await deleteDoc(doc(db, 'categories', categoryId));
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

export const transferFunds = async (
  sourceCategory: CategoryCardType,
  targetCategory: CategoryCardType,
  amount: number,
  description: string
): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      // Получаем актуальные данные категорий
      const sourceRef = doc(db, 'categories', sourceCategory.id);
      const targetRef = doc(db, 'categories', targetCategory.id);
      
      const sourceDoc = await transaction.get(sourceRef);
      const targetDoc = await transaction.get(targetRef);

      if (!sourceDoc.exists() || !targetDoc.exists()) {
        throw new Error('Одна из категорий не существует');
      }

      // Получаем текущие балансы
      const sourceBalance = parseAmount(sourceDoc.data().amount);
      const targetBalance = parseAmount(targetDoc.data().amount);

      // Проверяем достаточно ли средств
      if (sourceBalance < amount) {
        throw new Error('Недостаточно средств для перевода');
      }

      // Создаем транзакцию расхода для источника
      const withdrawalRef = doc(collection(db, 'transactions'));
      transaction.set(withdrawalRef, {
        categoryId: sourceCategory.id,
        fromUser: sourceCategory.title,
        toUser: targetCategory.title,
        amount: -amount, // Отрицательная сумма для расхода
        description,
        type: 'expense',
        date: serverTimestamp()
      });

      // Создаем транзакцию дохода для получателя
      const depositRef = doc(collection(db, 'transactions'));
      transaction.set(depositRef, {
        categoryId: targetCategory.id,
        fromUser: sourceCategory.title,
        toUser: targetCategory.title,
        amount: amount, // Положительная сумма для дохода
        description,
        type: 'income',
        date: serverTimestamp()
      });

      // Обновляем баланс источника (вычитаем сумму)
      const newSourceBalance = sourceBalance - amount;
      transaction.update(sourceRef, {
        amount: formatAmount(newSourceBalance),
        updatedAt: serverTimestamp()
      });

      // Обновляем баланс получателя (добавляем сумму)
      const newTargetBalance = targetBalance + amount;
      transaction.update(targetRef, {
        amount: formatAmount(newTargetBalance),
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Error transferring funds:', error);
    throw error;
  }
};

export const addContract = async (contractData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'contracts'), {
      ...contractData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding contract:', error);
    throw error;
  }
};

export const deleteClientContracts = async (clientId: string) => {
  try {
    const q = query(collection(db, 'contracts'), where('clientId', '==', clientId));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting client contracts:', error);
    throw error;
  }
};