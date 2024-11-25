import React, { useState } from 'react';
import { CategoryCardType } from '../types';
import { ContextMenu } from './ContextMenu';
import { EditCategoryModal } from './EditCategoryModal';
import { TransactionHistoryModal } from './TransactionHistoryModal';
import { TransferModal } from './TransferModal';
import { deleteCategory } from '../lib/firebase';
import { Building2, Car, Globe, Hammer, Home, Package, User, Wallet } from 'lucide-react';

interface CategoryCardProps {
  category: CategoryCardType;
  onDragStart?: (category: CategoryCardType) => void;
  onDragEnd?: () => void;
  onDrop?: (sourceCategory: CategoryCardType, targetCategory: CategoryCardType) => void;
  onDelete?: (categoryId: string) => void;
}

const iconComponents = {
  Building2,
  Car,
  User,
  Globe,
  Hammer,
  Home,
  Package,
  Wallet
};

const formatAmount = (amount: string): string => {
  const value = parseFloat(amount.replace(/[^\d.-]/g, ''));
  const formatted = new Intl.NumberFormat('ru-RU').format(Math.abs(value));
  return `${value < 0 ? '-' : ''}${formatted} ₸`;
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ 
  category,
  onDragStart,
  onDragEnd,
  onDrop,
  onDelete
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetCategory, setTargetCategory] = useState<CategoryCardType | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const IconComponent = iconComponents[category.iconName as keyof typeof iconComponents] || Building2;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleEdit = () => {
    setShowContextMenu(false);
    setShowEditModal(true);
  };

  const handleDelete = async (deleteAll: boolean = false) => {
    try {
      await deleteCategory(category.id, category.title, deleteAll);
      if (onDelete) {
        onDelete(category.id);
      }
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Ошибка при удалении категории');
    }
  };

  const handleClick = () => {
    if (!showContextMenu && !showEditModal) {
      setShowTransactionHistory(true);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', category.id);
    e.currentTarget.classList.add('dragging');
    onDragStart?.(category);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    e.currentTarget.classList.remove('dragging');
    onDragEnd?.();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) {
      e.currentTarget.classList.add('can-drop');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('can-drop');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('can-drop');
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId !== category.id) {
      setTargetCategory(category);
      setShowTransferModal(true);
    }
  };

  return (
    <>
      <div 
        className="flex flex-col items-center space-y-1 sm:space-y-2 category-card"
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-category-id={category.id}
      >
        <div className={`w-14 h-14 sm:w-16 sm:h-16 ${category.color} rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:opacity-90 transition-opacity`}>
          <IconComponent className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <div className="text-xs sm:text-sm font-normal text-gray-700 mb-0.5 truncate max-w-[80px] sm:max-w-[120px]">
            {category.title}
          </div>
          <div className={`text-sm sm:text-base font-medium ${
            category.amount.includes('-') ? 'text-red-500' : 'text-emerald-500'
          }`}>
            {formatAmount(category.amount)}
          </div>
        </div>
      </div>

      {showContextMenu && (
        <ContextMenu
          position={contextMenuPosition}
          onClose={() => setShowContextMenu(false)}
          onEdit={handleEdit}
          onDelete={() => setShowDeleteModal(true)}
          title={category.title}
        />
      )}

      {showEditModal && (
        <EditCategoryModal
          category={category}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showTransactionHistory && (
        <TransactionHistoryModal
          category={category}
          isOpen={showTransactionHistory}
          onClose={() => setShowTransactionHistory(false)}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Удаление категории</h2>
            <p className="text-gray-700 mb-6">
              Удаляя "{category.title}", вы хотите:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleDelete(false)}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <p className="font-medium text-gray-900">Убрать только иконку</p>
                <p className="text-sm text-gray-500">История операций сохранится в базе данных</p>
              </button>

              <button
                onClick={() => handleDelete(true)}
                className="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <p className="font-medium text-red-600">Стереть все операции</p>
                <p className="text-sm text-red-500">Удалится иконка и все связанные с ней данные</p>
              </button>

              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-2 text-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && targetCategory && (
        <TransferModal
          sourceCategory={category}
          targetCategory={targetCategory}
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setTargetCategory(null);
          }}
        />
      )}
    </>
  );
};