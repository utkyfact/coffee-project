import React, { useState, useEffect } from 'react';
import Table from './Table';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { IoSettingsOutline } from "react-icons/io5";

const TableLayout = ({ tables, onTableClick }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggingTable, setDraggingTable] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [optimisticPositions, setOptimisticPositions] = useState({});
  const [isUpdatingPosition, setIsUpdatingPosition] = useState(false);

  // Global mouse events - throttled for better performance
  useEffect(() => {
    let animationFrameId = null;
    let lastUpdateTime = 0;
    const THROTTLE_MS = 16; // ~60fps

    const handleMouseMove = (e) => {
      if (!isEditMode || !isDragging || !draggingTable) return;
      
      const now = Date.now();
      if (now - lastUpdateTime < THROTTLE_MS) return;
      lastUpdateTime = now;
      
      // Use requestAnimationFrame for smooth updates
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
        const container = document.getElementById('table-layout-container');
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        
        // Mouse pozisyonunu container'a göre hesapla
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;
        
        // Masa boyutları (Table component'inden)
        const tableWidth = 128; // w-32 = 128px
        const tableHeight = 96;  // h-24 = 96px
        
        // Sınırları hesapla
        const maxX = containerRect.width - tableWidth;
        const maxY = containerRect.height - tableHeight;
        
        // Yeni pozisyonu hesapla (drag offset'ini çıkar)
        let newX = mouseX - dragOffset.x;
        let newY = mouseY - dragOffset.y;
        
        // Sınırları uygula
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        // Optimistic update - UI'da hemen göster
        setOptimisticPositions(prev => ({
          ...prev,
          [draggingTable]: { x: newX, y: newY }
        }));
      });
    };

    const handleMouseUp = async () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (isDragging && draggingTable) {
        const newPosition = optimisticPositions[draggingTable];
        if (newPosition) {
          
          try {
            setIsUpdatingPosition(true);
            
            // Pozisyonu yuvarlamak için (pixel-perfect positioning)
            const roundedPosition = {
              x: Math.round(newPosition.x),
              y: Math.round(newPosition.y)
            };
            
            // Firebase'de masa pozisyonunu güncelle
            const tableRef = doc(db, 'tables', draggingTable);
            await updateDoc(tableRef, {
              'location.coordinates': roundedPosition,
              updatedAt: new Date()
            });
            
            // Optimistic position'ı temizle
            setOptimisticPositions(prev => {
              const newPositions = { ...prev };
              delete newPositions[draggingTable];
              return newPositions;
            });
            
          } catch (error) {
            console.error('❌ Pozisyon güncellenirken hata:', error);
            // Hata durumunda optimistic update'i geri al
            setOptimisticPositions(prev => {
              const newPositions = { ...prev };
              delete newPositions[draggingTable];
              return newPositions;
            });
          } finally {
            setIsUpdatingPosition(false);
          }
        }
      }
      setIsDragging(false);
      setDraggingTable(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isEditMode, isDragging, draggingTable, dragOffset, optimisticPositions]);
  
  // Mouse down ile sürükleme başlat
  const handleMouseDown = (e, tableId) => {
    if (!isEditMode) return;
    
    const element = e.currentTarget;
    const rect = element.getBoundingClientRect();
    const container = document.getElementById('table-layout-container');
    
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    // Mouse'un masa içindeki pozisyonunu hesapla
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // Masa pozisyonunu al
    const tablePosition = getTablePosition(tables.find(t => t.id === tableId), tables.findIndex(t => t.id === tableId));
    
    // Offset'i hesapla (mouse'un masa içindeki pozisyonu)
    const offsetX = mouseX - tablePosition.x;
    const offsetY = mouseY - tablePosition.y;
    
    setDraggingTable(tableId);
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    e.preventDefault();
    e.stopPropagation();
  };
  
  // Düzenleme modunu değiştirme
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setIsDragging(false);
    setDraggingTable(null);
    setOptimisticPositions({});
  };
  
  // Varsayılan pozisyonları oluşturma (Firebase'de koordinat yoksa)
  const getDefaultPosition = (index) => {
    const columns = 5;
    const columnWidth = 160; // Masa genişliği + boşluk
    const rowHeight = 120;   // Masa yüksekliği + boşluk
    
    const row = Math.floor(index / columns);
    const col = index % columns;
    const offsetX = row % 2 === 0 ? 0 : 30;
    
    return {
      x: col * columnWidth + 20 + offsetX,
      y: row * rowHeight + 20
    };
  };

  const getTablePosition = (table, index) => {
    const tableId = table.id;
    
    if (optimisticPositions[tableId]) {
      return optimisticPositions[tableId];
    }
    
    if (table.location?.coordinates && (table.location.coordinates.x !== 0 || table.location.coordinates.y !== 0)) {
      return {
        x: table.location.coordinates.x,
        y: table.location.coordinates.y
      };
    }
    
    return getDefaultPosition(index);
  };

  const handleTableClick = (table, e) => {
    if (isEditMode) {
      e?.preventDefault();
      e?.stopPropagation();
      return;
    }
    onTableClick(table);
  };
  
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-base-content/70">
          {isEditMode && <div className='flex items-center gap-2'>
            <IoSettingsOutline className='text-2xl' />
            <span>Düzenleme modu</span>
          </div>}
          {isUpdatingPosition && <span className="ml-2">💾 Kaydediliyor...</span>}
        </div>
        <button 
          className={`btn ${isEditMode ? 'btn-error' : 'btn-primary'}`}
          onClick={toggleEditMode}
          disabled={isUpdatingPosition}
        >
          {isEditMode ? 'Düzenlemeyi Bitir' : 'Düzenle'}
        </button>
      </div>
      
      <div 
        id="table-layout-container"
        className="relative w-full h-[700px] border border-dashed border-base-300 rounded-lg overflow-hidden bg-base-200 p-4"
        style={{ 
          userSelect: isDragging ? 'none' : 'auto',
          willChange: isDragging ? 'contents' : 'auto'
        }}
      >
        
        {/* Masalar */}
        {tables.map((table, index) => {
          const tableId = table.id;
          const position = getTablePosition(table, index);
          const isCurrentlyDragging = isDragging && draggingTable === tableId;
          
          return (
            <div 
              key={tableId}
              style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                cursor: isEditMode ? (isCurrentlyDragging ? 'grabbing' : 'grab') : 'pointer',
                transition: isCurrentlyDragging ? 'none' : 'transform 0.15s ease-out',
                opacity: isCurrentlyDragging ? 0.9 : 1,
                zIndex: isCurrentlyDragging ? 1000 : 1,
                transform: isCurrentlyDragging ? 'scale(1.02)' : 'scale(1)',
                willChange: isCurrentlyDragging ? 'transform' : 'auto'
              }}
              onMouseDown={(e) => handleMouseDown(e, tableId)}
              onClick={(e) => handleTableClick(table, e)}
            >
              <Table 
                table={table} 
                onClick={(table) => handleTableClick(table)}
                isEditMode={isEditMode}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TableLayout; 