import React from 'react';
import { FiAlertTriangle, FiTrash2 } from 'react-icons/fi';

// Silme Onay Modalı Bileşeni
const DeleteConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Silme Onayı", 
  message, 
  itemName,
  confirmText = "Sil",
  cancelText = "İptal" 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-base-100 p-6 rounded-lg w-full max-w-md shadow-xl animate-scale-in">
        <div className="flex items-center mb-4 text-error">
          <div className="bg-error/10 p-3 rounded-full mr-3">
            <FiAlertTriangle size={24} className="text-error" />
          </div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        
        <p className="mb-2 text-base-content/80">{message}</p>
        
        {itemName && (
          <div className="bg-base-200 p-3 rounded-md mb-4 font-medium text-center">
            "{itemName}"
          </div>
        )}
        
        <div className="modal-action">
          <button 
            className="btn btn-ghost" 
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className="btn btn-error" 
            onClick={onConfirm}
          >
            <FiTrash2 className="mr-2" /> {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal; 