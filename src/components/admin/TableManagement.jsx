import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { FiPlus, FiEdit3, FiTrash2, FiCoffee, FiUsers, FiMapPin, FiToggleLeft, FiToggleRight, FiSave, FiX } from 'react-icons/fi';
import DeleteConfirmModal from './DeleteConfirmModal';
import { showSuccessNotification, showErrorNotification } from '../../utils/dashboardNotifications';

// TODO sipariş verilince ve sonrasında sipariş durumu değişince eski siparişler de görünüyor.

const TableManagement = () => {
  // State'ler
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form state'leri
  const [editingTable, setEditingTable] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);
  
  // Yeni masa formu
  const [newTable, setNewTable] = useState({
    number: '',
    capacity: 4,
    status: 'available',
    location: {
      x: 100,
      y: 100
    },
    description: ''
  });

  // Firebase'den masaları çek
  useEffect(() => {
    const tablesQuery = query(collection(db, 'tables'), orderBy('number'));
    
    const unsubscribe = onSnapshot(tablesQuery, (snapshot) => {
      const tablesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTables(tablesData);
      setIsLoading(false);
    }, (error) => {
      console.error('Masalar yüklenirken hata:', error);
      setError(error.message);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Yeni masa oluştur
  const handleCreateTable = async () => {
    try {
      setIsCreating(true);
      
      // Masa numarası kontrolü
      const tableExists = tables.find(t => t.number === parseInt(newTable.number));
      if (tableExists) {
        throw new Error('Bu masa numarası zaten mevcut!');
      }

      const tableData = {
        ...newTable,
        number: parseInt(newTable.number),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'tables'), tableData);
      
      // Formu temizle
      setNewTable({
        number: '',
        capacity: 4,
        status: 'available',
        location: { x: 100, y: 100 },
        description: ''
      });
      
      showSuccessNotification('Masa başarıyla oluşturuldu');
    } catch (error) {
      console.error('Masa oluşturulurken hata:', error);
      showErrorNotification('Masa oluşturulurken hata oluştu', error.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Masa güncelle
  const handleUpdateTable = async () => {
    try {
      setIsUpdating(true);
      
      const tableData = {
        ...editingTable,
        number: parseInt(editingTable.number),
        updatedAt: new Date()
      };

      const tableRef = doc(db, 'tables', editingTable.id);
      await updateDoc(tableRef, tableData);
      
      setEditingTable(null);
      showSuccessNotification('Masa başarıyla güncellendi');
    } catch (error) {
      console.error('Masa güncellenirken hata:', error);
      showErrorNotification('Masa güncellenirken hata oluştu', error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Masa sil
  const handleDeleteTable = async () => {
    try {
      setIsDeleting(true);
      
      const tableRef = doc(db, 'tables', tableToDelete.id);
      await deleteDoc(tableRef);
      
      setShowDeleteModal(false);
      setTableToDelete(null);
      showSuccessNotification('Masa başarıyla silindi');
    } catch (error) {
      console.error('Masa silinirken hata:', error);
      showErrorNotification('Masa silinirken hata oluştu', error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Düzenleme modunu aç
  const handleEditTable = (table) => {
    setEditingTable({ ...table });
  };

  // Silme modalını aç
  const handleDeleteClick = (table) => {
    setTableToDelete(table);
    setShowDeleteModal(true);
  };

  // Masa durumu değiştir
  const handleToggleStatus = async (table) => {
    try {
      const newStatus = table.status === 'available' ? 'maintenance' : 'available';
      const tableRef = doc(db, 'tables', table.id);
      
      await updateDoc(tableRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      showSuccessNotification(`Masa durumu ${newStatus === 'available' ? 'aktif' : 'bakım'} olarak değiştirildi`);
    } catch (error) {
      console.error('Masa durumu güncellenirken hata:', error);
      showErrorNotification('Masa durumu güncellenirken hata oluştu', error.message);
    }
  };

  // Masa temizle - tüm siparişleri completed yap
  const handleClearTable = async (table) => {
    try {
      // Masanın aktif siparişlerini bul
      const ordersQuery = query(
        collection(db, 'orders'),
        where('tableId', '==', table.id),
        where('status', 'in', ['pending', 'ordered', 'preparing', 'delivered', 'served'])
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      
      // Tüm aktif siparişleri completed yap
      const updatePromises = ordersSnapshot.docs.map(doc => {
        return updateDoc(doc.ref, {
          status: 'completed',
          updatedAt: new Date()
        });
      });
      
      await Promise.all(updatePromises);
      
      // Masa durumunu available yap
      const tableRef = doc(db, 'tables', table.id);
      await updateDoc(tableRef, {
        status: 'available',
        updatedAt: new Date()
      });
      
      showSuccessNotification(`Masa ${table.number} temizlendi ve tüm siparişler tamamlandı`);
    } catch (error) {
      console.error('Masa temizlenirken hata:', error);
      showErrorNotification('Masa temizlenirken hata oluştu', error.message);
    }
  };

  // Durum rengini al
  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'badge-success';
      case 'occupied': return 'badge-error';
      case 'reserved': return 'badge-warning';
      case 'cleaning': return 'badge-info';
      case 'maintenance': return 'badge-secondary';
      default: return 'badge-ghost';
    }
  };

  // Durum metnini al
  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Boş';
      case 'occupied': return 'Dolu';
      case 'reserved': return 'Rezerve';
      case 'cleaning': return 'Temizleniyor';
      case 'maintenance': return 'Bakım';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Masalar yüklenirken hata oluştu: {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FiCoffee className="text-primary" />
            Masa Yönetimi
          </h2>
          <p className="text-base-content/70">Masaları ekleyin, düzenleyin ve yönetin</p>
        </div>
        <div className="stats shadow w-full sm:w-auto">
          <div className="stat">
            <div className="stat-title">Toplam Masa</div>
            <div className="stat-value text-primary">{tables.length}</div>
          </div>
        </div>
      </div>

      {/* Yeni Masa Ekleme Formu */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">
            <FiPlus className="text-primary" />
            Yeni Masa Ekle
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="form-control flex flex-col">
              <label className="label">
                <span className="label-text">Masa Numarası</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={newTable.number}
                onChange={(e) => setNewTable({ ...newTable, number: e.target.value })}
                min="1"
              />
            </div>
            
            <div className="form-control flex flex-col">
              <label className="label">
                <span className="label-text">Kapasite</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={newTable.capacity}
                onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) })}
              >
                <option value={2}>2 Kişilik</option>
                <option value={4}>4 Kişilik</option>
                <option value={6}>6 Kişilik</option>
                <option value={8}>8 Kişilik</option>
                <option value={10}>10 Kişilik</option>
              </select>
            </div>
            
            <div className="form-control flex flex-col">
              <label className="label">
                <span className="label-text">Durum</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={newTable.status}
                onChange={(e) => setNewTable({ ...newTable, status: e.target.value })}
              >
                <option value="available">Boş</option>
                <option value="maintenance">Bakım</option>
              </select>
            </div>
            
            <div className="form-control flex flex-col">
              <label className="label">
                <span className="label-text">Açıklama</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={newTable.description}
                onChange={(e) => setNewTable({ ...newTable, description: e.target.value })}
              />
            </div>
          </div>
          
          <div className="card-actions justify-end mt-4">
            <button
              className="btn btn-primary"
              onClick={handleCreateTable}
              disabled={isCreating || !newTable.number}
            >
              {isCreating ? (
                <>
                  <div className="loading loading-spinner loading-sm"></div>
                  Ekleniyor...
                </>
              ) : (
                <>
                  <FiPlus />
                  Masa Ekle
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Masalar Listesi */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">
            <FiUsers />
            Mevcut Masalar ({tables.length})
          </h3>
          
          {tables.length === 0 ? (
            <div className="text-center py-8">
              <FiCoffee className="mx-auto text-4xl text-base-content/30 mb-4" />
              <p className="text-base-content/70">Henüz masa eklenmemiş</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th className="min-w-[100px]">Masa No</th>
                    <th className="hidden sm:table-cell">Kapasite</th>
                    <th className="hidden sm:table-cell">Durum</th>
                    <th className="hidden md:table-cell">Konum</th>
                    <th className="hidden lg:table-cell">Açıklama</th>
                    <th className="min-w-[120px]">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((table) => (
                    <tr key={table.id}>
                      <td>
                        <div className="font-bold">Masa {table.number}</div>
                      </td>
                      <td className="hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <FiUsers className="text-primary" />
                          {table.capacity} Kişi
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">
                        <span className={`badge ${getStatusColor(table.status)}`}>
                          {getStatusText(table.status)}
                        </span>
                      </td>
                      <td className="hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <FiMapPin className="text-primary" />
                          X: {table.location?.x || 0}, Y: {table.location?.y || 0}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell">
                        <span className="text-sm opacity-70">
                          {table.description || '-'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleEditTable(table)}
                            title="Düzenle"
                          >
                            <FiEdit3 />
                          </button>
                          
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleToggleStatus(table)}
                            title={table.status === 'available' ? 'Bakıma Al' : 'Aktif Et'}
                          >
                            {table.status === 'available' ? <FiToggleLeft /> : <FiToggleRight />}
                          </button>
                          
                          {table.status !== 'available' && (
                            <button
                              className="btn btn-sm btn-warning btn-ghost"
                              onClick={() => handleClearTable(table)}
                              title="Masa Temizle"
                            >
                              <FiCoffee />
                            </button>
                          )}
                          
                          <button
                            className="btn btn-sm btn-error btn-ghost"
                            onClick={() => handleDeleteClick(table)}
                            title="Sil"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Düzenleme Modal */}
      {editingTable && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Masa Düzenle</h3>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Masa Numarası</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={editingTable.number}
                  onChange={(e) => setEditingTable({ ...editingTable, number: e.target.value })}
                  min="1"
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Kapasite</span>
                </label>
                <select
                  className="select select-bordered"
                  value={editingTable.capacity}
                  onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) })}
                >
                  <option value={2}>2 Kişilik</option>
                  <option value={4}>4 Kişilik</option>
                  <option value={6}>6 Kişilik</option>
                  <option value={8}>8 Kişilik</option>
                  <option value={10}>10 Kişilik</option>
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Durum</span>
                </label>
                <select
                  className="select select-bordered"
                  value={editingTable.status}
                  onChange={(e) => setEditingTable({ ...editingTable, status: e.target.value })}
                >
                  <option value="available">Boş</option>
                  <option value="occupied">Dolu</option>
                  <option value="reserved">Rezerve</option>
                  <option value="cleaning">Temizleniyor</option>
                  <option value="maintenance">Bakım</option>
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Açıklama</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={editingTable.description || ''}
                  onChange={(e) => setEditingTable({ ...editingTable, description: e.target.value })}
                />
              </div>
            </div>
            
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setEditingTable(null)}
              >
                <FiX />
                İptal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdateTable}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <div className="loading loading-spinner loading-sm"></div>
                    Güncelleniyor...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Güncelle
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteTable}
        title="Masa Sil"
        message={`"Masa ${tableToDelete?.number}" masasını silmek istediğinizden emin misiniz?`}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default TableManagement; 