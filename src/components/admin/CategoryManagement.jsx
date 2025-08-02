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
  where
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import DeleteConfirmModal from './DeleteConfirmModal';
import {
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
  FiSave,
  FiX,
  FiImage,
  FiBarChart2,
  FiPackage,
  FiTag,
  FiEye,
  FiTrendingUp,
  FiArrowUp,
  FiArrowDown
} from 'react-icons/fi';

const CategoryManagement = () => {
  // State'ler
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // UI States
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteModalConfig, setDeleteModalConfig] = useState({
    isOpen: false,
    categoryId: null,
    categoryName: ''
  });

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    color: '#6366f1',
    order: 0,
    isActive: true
  });

  // Firebase'den kategorileri çek
  useEffect(() => {
    const categoriesQuery = query(collection(db, 'categories'), orderBy('order'));
    
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(categoriesData);
      setIsLoading(false);
    }, (error) => {
      console.error('Kategoriler yüklenirken hata:', error);
      setError(error.message);
      setIsLoading(false);
    });

    return () => unsubscribeCategories();
  }, []);

  // Firebase'den kategori istatistiklerini çek
  useEffect(() => {
    const menuQuery = query(collection(db, 'menuItems'));
    
    const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
      const menuItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Kategori istatistiklerini hesapla
      const categoryStats = {};
      categories.forEach(category => {
        const itemsInCategory = menuItems.filter(item => item.category === category.name);
        categoryStats[category.id] = {
          totalItems: itemsInCategory.length,
          activeItems: itemsInCategory.filter(item => item.isAvailable).length,
          totalRevenue: itemsInCategory.reduce((sum, item) => sum + (item.price || 0), 0)
        };
      });
      
      setStats(categoryStats);
    }, (error) => {
      console.error('Menü istatistikleri yüklenirken hata:', error);
    });

    return () => unsubscribeMenu();
  }, [categories]);

  // Predefined colors
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
    '#10b981', '#06b6d4', '#8b5a2b', '#6b7280', '#1f2937'
  ];

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Open modal for new category
  const handleAddCategory = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      image: '',
      color: '#6366f1',
      order: categories.length,
      isActive: true
    });
    setShowModal(true);
  };

  // Open modal for editing category
  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      image: category.image || '',
      color: category.color || '#6366f1',
      order: category.order || 0,
      isActive: category.isActive !== false
    });
    setShowModal(true);
  };

  // Save category (create or update)
  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        setIsUpdating(true);
        
        // Update existing category
        const categoryRef = doc(db, 'categories', editingCategory.id);
        await updateDoc(categoryRef, {
          name: formData.name,
          description: formData.description,
          image: formData.image,
          color: formData.color,
          order: parseInt(formData.order) || 0,
          isActive: formData.isActive,
          updatedAt: new Date()
        });
      } else {
        setIsCreating(true);
        
        // Create new category
        await addDoc(collection(db, 'categories'), {
          name: formData.name,
          description: formData.description,
          image: formData.image,
          color: formData.color,
          order: parseInt(formData.order) || 0,
          isActive: formData.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      setShowModal(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Kategori kaydedilirken hata:', error);
      alert('Kategori kaydedilirken bir hata oluştu: ' + error.message);
    } finally {
      setIsCreating(false);
      setIsUpdating(false);
    }
  };

  // Delete category
  const handleDeleteCategory = (category) => {
    setDeleteModalConfig({
      isOpen: true,
      categoryId: category.id,
      categoryName: category.name
    });
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      
      const categoryRef = doc(db, 'categories', deleteModalConfig.categoryId);
      await deleteDoc(categoryRef);
      
      setDeleteModalConfig({ isOpen: false, categoryId: null, categoryName: '' });
    } catch (error) {
      console.error('Kategori silinirken hata:', error);
      alert('Kategori silinirken bir hata oluştu: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle category status
  const handleToggleStatus = async (category) => {
    try {
      const categoryRef = doc(db, 'categories', category.id);
      await updateDoc(categoryRef, {
        isActive: !category.isActive,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Durum güncellenirken hata:', error);
      alert('Durum güncellenirken bir hata oluştu: ' + error.message);
    }
  };

  // Move category up/down
  const handleMoveCategory = async (category, direction) => {
    try {
      const currentIndex = categories.findIndex(c => c.id === category.id);
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (newIndex < 0 || newIndex >= categories.length) return;
      
      const targetCategory = categories[newIndex];
      
      // Swap orders
      const categoryRef = doc(db, 'categories', category.id);
      const targetRef = doc(db, 'categories', targetCategory.id);
      
      await updateDoc(categoryRef, {
        order: targetCategory.order,
        updatedAt: new Date()
      });
      
      await updateDoc(targetRef, {
        order: category.order,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Kategori sırası güncellenirken hata:', error);
      alert('Kategori sırası güncellenirken bir hata oluştu: ' + error.message);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      image: '',
      color: '#6366f1',
      order: 0,
      isActive: true
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">Yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Hata: {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Kategori Yönetimi</h2>
          <p className="text-base-content/70">Menü kategorilerini yönetin</p>
        </div>
        <button 
          className="btn btn-primary w-full sm:w-auto"
          onClick={handleAddCategory}
        >
          <FiPlus className="mr-2" />
          Yeni Kategori
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category, index) => (
          <div key={category.id} className="card bg-base-100 shadow-lg">
            {category.image && (
              <figure className="h-32">
                <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
              </figure>
            )}
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <h3 className="card-title text-lg">{category.name}</h3>
                <div 
                  className="w-4 h-4 rounded-full border border-white"
                  style={{ backgroundColor: category.color }}
                ></div>
              </div>
              
              {category.description && (
                <p className="text-sm text-base-content/70">{category.description}</p>
              )}
              
              <div className="stats stats-horizontal shadow mt-3">
                <div className="stat">
                  <div className="stat-title text-xs">Ürün</div>
                  <div className="stat-value text-sm">{stats[category.id]?.totalItems || 0}</div>
                </div>
                <div className="stat">
                  <div className="stat-title text-xs">Aktif</div>
                  <div className="stat-value text-sm">{stats[category.id]?.activeItems || 0}</div>
                </div>
              </div>
              
              <div className="card-actions justify-end mt-3">
                <div className="flex gap-1">
                  <button 
                    className="btn btn-xs btn-outline"
                    onClick={() => handleMoveCategory(category, 'up')}
                    disabled={index === 0}
                  >
                    <FiArrowUp />
                  </button>
                  <button 
                    className="btn btn-xs btn-outline"
                    onClick={() => handleMoveCategory(category, 'down')}
                    disabled={index === categories.length - 1}
                  >
                    <FiArrowDown />
                  </button>
                  <button 
                    className="btn btn-xs btn-outline"
                    onClick={() => handleEditCategory(category)}
                  >
                    <FiEdit3 />
                  </button>
                  <button 
                    className="btn btn-xs btn-outline"
                    onClick={() => handleToggleStatus(category)}
                  >
                    {category.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                  </button>
                  <button 
                    className="btn btn-xs btn-error"
                    onClick={() => handleDeleteCategory(category)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Category Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">
              {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Kategori Adı *</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className="input input-bordered w-full"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Sıra</span>
                </label>
                <input
                  type="number"
                  name="order"
                  className="input input-bordered w-full"
                  value={formData.order}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              
              <div className="form-control flex flex-col md:col-span-2">
                <label className="label">
                  <span className="label-text">Açıklama</span>
                </label>
                <textarea
                  name="description"
                  className="textarea textarea-bordered w-full"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>
              
              <div className="form-control flex flex-col md:col-span-2">
                <label className="label">
                  <span className="label-text">Resim URL</span>
                </label>
                <input
                  type="url"
                  name="image"
                  className="input input-bordered w-full"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Renk</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-primary' : 'border-base-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
              
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Aktif</span>
                  <input
                    type="checkbox"
                    name="isActive"
                    className="toggle toggle-primary"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                </label>
              </div>
            </div>
            
            <div className="modal-action">
              <button 
                className="btn btn-outline"
                onClick={handleCloseModal}
              >
                <FiX className="mr-1" />
                İptal
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveCategory}
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-1" />
                    Kaydet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        title="Kategoriyi Sil"
        message={`"${deleteModalConfig.categoryName}" kategorisini silmek istediğinizden emin misiniz?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalConfig({ isOpen: false, categoryId: null, categoryName: '' })}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default CategoryManagement; 