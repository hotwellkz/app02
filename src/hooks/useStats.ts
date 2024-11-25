import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TopStatType } from '../types';

export const useStats = () => {
  const [stats, setStats] = useState<TopStatType[]>([
    { label: 'Баланс', value: '0 ₸' },
    { label: 'Расходы', value: '0 ₸' },
    { label: 'В планах', value: '0 ₸' },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let totalBalance = 0;
        let totalExpenses = 0;

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const amount = data.amount;
          
          if (amount < 0) {
            totalExpenses += Math.abs(amount);
            totalBalance += amount; // Уменьшаем баланс на сумму расхода
          } else {
            totalBalance += amount; // Увеличиваем баланс на сумму дохода
          }
        });

        setStats([
          { label: 'Баланс', value: `${totalBalance.toLocaleString()} ₸` },
          { label: 'Расходы', value: `${totalExpenses.toLocaleString()} ₸` },
          { label: 'В планах', value: '0 ₸' },
        ]);
        setLoading(false);
      }, (error) => {
        console.error('Transactions subscription error:', error);
        setError(error.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error in useStats:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setLoading(false);
    }
  }, []);

  return { stats, loading, error };
};