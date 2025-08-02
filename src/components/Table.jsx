import React from 'react';
import { Link } from 'react-router';
import { FiEye, FiCoffee } from 'react-icons/fi';

const Table = ({ table, onClick, isEditMode = false }) => {
  // Masa durumuna göre renk belirleme
  const getStatusColor = () => {
    switch (table.status) {
      case 'empty': return 'bg-base-300'; // Boş masa - gri
      case 'pending': return 'bg-primary'; // Sipariş alındı - primary
      case 'ordered': return 'bg-primary'; // Sipariş verildi - primary
      case 'preparing': return 'bg-warning'; // Hazırlanıyor - warning
      case 'delivered': return 'bg-success'; // Teslim edildi - success
      case 'serving': return 'bg-info'; // Servis ediliyor - info
      case 'completed': return 'bg-success'; // Tamamlandı - success
      case 'occupied': return 'bg-error'; // Dolu - kırmızı
      case 'reserved': return 'bg-secondary'; // Rezerve - secondary
      case 'cleaning': return 'bg-neutral'; // Temizleniyor - nötr
      case 'available': return 'bg-base-300'; // Firebase için available durumu
      default: return 'bg-base-300';
    }
  };

  // Masa durumuna göre metin
  const getStatusText = () => {
    switch (table.status) {
      case 'empty': return 'Boş';
      case 'pending': return 'Sipariş Alındı';
      case 'ordered': return 'Sipariş Alındı';
      case 'preparing': return 'Hazırlanıyor';
      case 'delivered': return 'Teslim Edildi';
      case 'serving': return 'Servis Ediliyor';
      case 'completed': return 'Tamamlandı';
      case 'occupied': return 'Dolu';
      case 'reserved': return 'Rezerve';
      case 'cleaning': return 'Temizleniyor';
      case 'available': return 'Boş'; // Firebase için available durumu
      default: return 'Boş';
    }
  };

  const handleClick = (e) => {
    if (isEditMode) {
      e.preventDefault();
      return;
    }
    onClick(table);
  };

  // Firebase ID'sini al
  const tableId = table.id;

  return (
    <div className="relative group">
      <div
        className={`w-32 h-24 relative transition-all bg-base-100 rounded-lg shadow-md border ${
          isEditMode 
            ? 'cursor-move border-primary border-2 border-dashed' 
            : 'cursor-pointer hover:scale-105'
        }`}
        onClick={handleClick}
        onMouseDown={(e) => {
          if (isEditMode) {
            e.preventDefault();
          }
        }}
      >
        {/* Masa durumu */}
        <div className={`absolute top-1 right-1 w-3 h-3 ${getStatusColor()} rounded-full border border-white`}></div>
        
        {/* Edit mode göstergesi */}
        {isEditMode && (
          <div className="absolute top-1 left-1 w-3 h-3 bg-primary rounded-full animate-pulse"></div>
        )}
        
        {/* Masa bilgileri */}
        <div className="p-2 h-full flex flex-col justify-between">
          <div className="text-center">
            <div className="font-bold text-sm">{table.name || `Masa ${table.number}`}</div>
            <div className="text-xs opacity-70">{getStatusText()}</div>
          </div>
          
          {/* Sipariş bilgisi */}
          {table.order && (
            <div className="text-xs text-center">
              <div className="font-medium">{table.order.customerName || 'Müşteri'}</div>
              <div className="opacity-70">{table.order.total?.toFixed(2)} ₺</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Hover'da gösterilen hızlı eylemler - sadece edit mode değilken */}
      {!isEditMode && table.status !== 'empty' && table.status !== 'available' && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <div className="flex gap-1 bg-base-100 rounded-md shadow-lg p-1 border">
            <Link 
              to={`/order-status/${tableId}`}
              className="btn btn-xs btn-ghost"
              title="Sipariş Takip"
              onClick={(e) => e.stopPropagation()}
            >
              <FiEye size={12} />
            </Link>
            <Link 
              to={`/menu/${table.number}`}
              className="btn btn-xs btn-ghost"
              title="Menü"
              onClick={(e) => e.stopPropagation()}
            >
              <FiCoffee size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table; 