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
import CategoryManagement from './CategoryManagement';
import { 
  FiPlus, 
  FiEdit3, 
  FiTrash2, 
  FiFilter, 
  FiGrid, 
  FiList, 
  FiImage,
  FiDollarSign,
  FiPackage,
  FiTag,
  FiToggleLeft,
  FiToggleRight,
  FiSave,
  FiX
} from 'react-icons/fi';

// TODO menü ekleme çalısmıyor

const MenuManagement = () => {
  // State'ler
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemsError, setItemsError] = useState(null);
  
  // UI States
  const [activeView, setActiveView] = useState('products'); // 'products', 'categories'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModalConfig, setDeleteModalConfig] = useState({
    isOpen: false,
    itemId: null,
    itemName: ''
  });

  // Form data for new/edit item
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    ingredients: [],
    tags: [],
    preparationTime: '',
    isAvailable: true
  });

  // Firebase'den menü öğelerini çek
  useEffect(() => {
    const menuQuery = query(collection(db, 'menuItems'), orderBy('name'));
    
    const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMenuItems(menuData);
      setItemsLoading(false);
    }, (error) => {
      console.error('Menü yüklenirken hata:', error);
      setItemsError(error.message);
      setItemsLoading(false);
    });

    return () => unsubscribeMenu();
  }, []);

  // Firebase'den kategorileri çek
  useEffect(() => {
    const categoriesQuery = query(collection(db, 'categories'), orderBy('name'));
    
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(categoriesData);
      setCategoriesLoading(false);
    }, (error) => {
      console.error('Kategoriler yüklenirken hata:', error);
      setCategoriesLoading(false);
    });

    return () => unsubscribeCategories();
  }, []);

  // Initialize form with categories
  useEffect(() => {
    if (categories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [categories, formData.category]);

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle array inputs (ingredients, tags)
  const handleArrayInputChange = (field, value) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [field]: array }));
  };

  // Open modal for new item
  const handleAddItem = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: categories.length > 0 ? categories[0].name : '',
      image: '',
      ingredients: [],
      tags: [],
      preparationTime: '',
      isAvailable: true
    });
    setShowItemModal(true);
  };

  // Open modal for editing item
  const handleEditItem = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      price: item.price?.toString() || '',
      category: item.category || '',
      image: item.image || '',
      ingredients: item.ingredients || [],
      tags: item.tags || [],
      preparationTime: item.preparationTime?.toString() || '',
      isAvailable: item.isAvailable !== false
    });
    setShowItemModal(true);
  };

  // Save item (create or update)
  const handleSaveItem = async () => {
    try {
      if (editingItem) {
        setIsUpdating(true);
        
        // Update existing item
        const itemRef = doc(db, 'menuItems', editingItem.id);
        await updateDoc(itemRef, {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price) || 0,
          category: formData.category,
          image: formData.image,
          ingredients: formData.ingredients,
          tags: formData.tags,
          preparationTime: parseInt(formData.preparationTime) || 0,
          isAvailable: formData.isAvailable,
          updatedAt: new Date()
        });
      } else {
        setIsAdding(true);
        
        // Create new item
        await addDoc(collection(db, 'menuItems'), {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price) || 0,
          category: formData.category,
          image: formData.image,
          ingredients: formData.ingredients,
          tags: formData.tags,
          preparationTime: parseInt(formData.preparationTime) || 0,
          isAvailable: formData.isAvailable,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      setShowItemModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Menü öğesi kaydedilirken hata:', error);
      alert('Menü öğesi kaydedilirken bir hata oluştu: ' + error.message);
    } finally {
      setIsAdding(false);
      setIsUpdating(false);
    }
  };

  // Delete item
  const handleDeleteItem = (item) => {
    setDeleteModalConfig({
      isOpen: true,
      itemId: item.id,
      itemName: item.name
    });
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      
      const itemRef = doc(db, 'menuItems', deleteModalConfig.itemId);
      await deleteDoc(itemRef);
      
      setDeleteModalConfig({ isOpen: false, itemId: null, itemName: '' });
    } catch (error) {
      console.error('Menü öğesi silinirken hata:', error);
      alert('Menü öğesi silinirken bir hata oluştu: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle item availability
  const handleToggleAvailability = async (item) => {
    try {
      const itemRef = doc(db, 'menuItems', item.id);
      await updateDoc(itemRef, {
        isAvailable: !item.isAvailable,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Durum güncellenirken hata:', error);
      alert('Durum güncellenirken bir hata oluştu: ' + error.message);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setShowItemModal(false);
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      image: '',
      ingredients: [],
      tags: [],
      preparationTime: '',
      isAvailable: true
    });
  };

  if (itemsLoading || categoriesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">Yükleniyor...</span>
      </div>
    );
  }

  if (itemsError) {
    return (
      <div className="alert alert-error">
        <span>Hata: {itemsError}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Menü Yönetimi</h2>
          <p className="text-base-content/70">Menü öğelerini ve kategorileri yönetin</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            className={`btn flex-1 sm:flex-none ${activeView === 'products' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveView('products')}
          >
            <FiPackage className="mr-2" />
            Ürünler
          </button>
          <button 
            className={`btn flex-1 sm:flex-none ${activeView === 'categories' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveView('categories')}
          >
            <FiTag className="mr-2" />
            Kategoriler
          </button>
        </div>
      </div>

      {activeView === 'products' ? (
        <>
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full sm:w-auto">
              <div className="form-control w-full sm:w-auto">
                <select 
                  className="select select-bordered w-full sm:w-auto"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-control w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Ara..."
                  className="input input-bordered w-full sm:w-auto"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                className={`btn btn-sm flex-1 sm:flex-none ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setViewMode('grid')}
              >
                <FiGrid />
              </button>
              <button 
                className={`btn btn-sm flex-1 sm:flex-none ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setViewMode('list')}
              >
                <FiList />
              </button>
              <button 
                className="btn btn-primary btn-sm flex-1 sm:flex-none"
                onClick={handleAddItem}
              >
                <FiPlus className="mr-1" />
                Yeni Ürün
              </button>
            </div>
          </div>

          {/* Menu Items Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <div key={item.id} className="card bg-base-100 shadow-lg">
                  {item.image && (
                    <figure className="h-48">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </figure>
                  )}
                  <div className="card-body">
                    <h3 className="card-title text-lg">{item.name}</h3>
                    <p className="text-sm text-base-content/70 line-clamp-2">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary">{item.price} ₺</span>
                      <span className="badge badge-outline">{item.category}</span>
                    </div>
                    <div className="card-actions justify-end mt-2">
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => handleEditItem(item)}
                      >
                        <FiEdit3 />
                      </button>
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => handleToggleAvailability(item)}
                      >
                        {item.isAvailable ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                      <button 
                        className="btn btn-sm btn-error"
                        onClick={() => handleDeleteItem(item)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th className="min-w-[200px]">Ürün</th>
                    <th className="hidden sm:table-cell">Kategori</th>
                    <th className="hidden md:table-cell">Fiyat</th>
                    <th className="hidden sm:table-cell">Durum</th>
                    <th className="min-w-[120px]">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <div className="avatar">
                              <div className="mask mask-squircle w-12 h-12">
                                <img src={item.image} alt={item.name} />
                              </div>
                            </div>
                          )}
                          <div>
                            <div className="font-bold">{item.name}</div>
                            <div className="text-sm opacity-50">{item.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">{item.category}</td>
                      <td className="hidden md:table-cell">{item.price} ₺</td>
                      <td className="hidden sm:table-cell">
                        <span className={`badge ${item.isAvailable ? 'badge-success' : 'badge-error'}`}>
                          {item.isAvailable ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button 
                            className="btn btn-xs btn-outline"
                            onClick={() => handleEditItem(item)}
                          >
                            <FiEdit3 />
                          </button>
                          <button 
                            className="btn btn-xs btn-outline"
                            onClick={() => handleToggleAvailability(item)}
                          >
                            {item.isAvailable ? <FiToggleRight /> : <FiToggleLeft />}
                          </button>
                          <button 
                            className="btn btn-xs btn-error"
                            onClick={() => handleDeleteItem(item)}
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
        </>
      ) : (
        <CategoryManagement />
      )}

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">
              {editingItem ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Ürün Adı *</span>
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
                  <span className="label-text">Kategori *</span>
                </label>
                <select
                  name="category"
                  className="select select-bordered w-full"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Kategori Seçin</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Fiyat (₺) *</span>
                </label>
                <input
                  type="number"
                  name="price"
                  className="input input-bordered w-full"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              
              <div className="form-control flex flex-col">
                <label className="label">
                  <span className="label-text">Hazırlama Süresi (dk)</span>
                </label>
                <input
                  type="number"
                  name="preparationTime"
                  className="input input-bordered w-full"
                  value={formData.preparationTime}
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
              
              <div className="form-control flex flex-col md:col-span-2">
                <label className="label">
                  <span className="label-text">Malzemeler (virgülle ayırın)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.ingredients.join(', ')}
                  onChange={(e) => handleArrayInputChange('ingredients', e.target.value)}
                  placeholder="Kahve, süt, şeker"
                />
              </div>
              
              <div className="form-control flex flex-col md:col-span-2">
                <label className="label">
                  <span className="label-text">Etiketler (virgülle ayırın)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.tags.join(', ')}
                  onChange={(e) => handleArrayInputChange('tags', e.target.value)}
                  placeholder="sıcak, popüler, vegan"
                />
              </div>
              
              <div className="form-control md:col-span-2">
                <label className="label cursor-pointer">
                  <span className="label-text">Mevcut</span>
                  <input
                    type="checkbox"
                    name="isAvailable"
                    className="toggle toggle-primary"
                    checked={formData.isAvailable}
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
                onClick={handleSaveItem}
                disabled={isAdding || isUpdating}
              >
                {isAdding || isUpdating ? (
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
        title="Ürünü Sil"
        message={`"${deleteModalConfig.itemName}" ürününü silmek istediğinizden emin misiniz?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalConfig({ isOpen: false, itemId: null, itemName: '' })}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default MenuManagement; 