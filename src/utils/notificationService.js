import { toast } from 'react-toastify';

// Firebase sipariş bildirimi için geliştirilmiş fonksiyon
export const showOrderNotification = (tableNumber, orderNumber, items, orderData = {}) => {
  const itemCount = items?.length || 0;
  const totalAmount = orderData.totalAmount || 0;
  const message = `Masa ${tableNumber} - Sipariş #${orderNumber}`;
  const description = `${itemCount} ürün sipariş edildi`;
  const amount = totalAmount > 0 ? `\nToplam: ${totalAmount.toLocaleString('tr-TR')} ₺` : '';
  
  toast.success(`${message}\n${description}${amount}\n${new Date().toLocaleTimeString('tr-TR')}`, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    toastId: `order-${orderNumber}`, // Aynı sipariş için tekrar gösterilmesini önle
  });
};

// Firebase sipariş durumu değişikliği bildirimi
export const showOrderStatusNotification = (tableNumber, orderNumber, status, orderData = {}) => {
  const statusTexts = {
    'pending': '⏳ Beklemede',
    'confirmed': '✅ Sipariş Onaylandı',
    'preparing': '👨‍🍳 Hazırlanıyor',
    'ready': '🔔 Hazır',
    'delivered': '✅ Teslim Edildi',
    'completed': '✅ Tamamlandı',
    'cancelled': '❌ İptal Edildi'
  };
  
  const statusText = statusTexts[status] || status;
  const message = `Masa ${tableNumber} - Sipariş #${orderNumber}`;
  const time = new Date().toLocaleTimeString('tr-TR');
  
  // Duruma göre farklı toast türleri
  let toastType = 'info';
  if (status === 'ready' || status === 'delivered' || status === 'completed') {
    toastType = 'success';
  } else if (status === 'cancelled') {
    toastType = 'error';
  } else if (status === 'preparing') {
    toastType = 'warning';
  }
  
  toast[toastType](`${message}\n${statusText}\n${time}`, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    toastId: `status-${orderNumber}-${status}`, // Aynı durum değişikliği için tekrar gösterilmesini önle
  });
};

// Firebase tablo durumu değişikliği bildirimi
export const showTableStatusNotification = (tableNumber, oldStatus, newStatus) => {
  const statusTexts = {
    'available': '🟢 Boş',
    'pending': '🟡 Sipariş Alındı',
    'ordered': '🟡 Sipariş Alındı',
    'preparing': '🟠 Hazırlanıyor',
    'delivered': '🟢 Teslim Edildi',
    'completed': '✅ Tamamlandı'
  };
  
  const oldStatusText = statusTexts[oldStatus] || oldStatus;
  const newStatusText = statusTexts[newStatus] || newStatus;
  const message = `Masa ${tableNumber} durumu değişti`;
  const details = `${oldStatusText} → ${newStatusText}`;
  
  toast.info(`${message}\n${details}\n${new Date().toLocaleTimeString('tr-TR')}`, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

// Firebase kullanıcı işlemleri bildirimi
export const showUserActionNotification = (action, userName, details = '') => {
  const actionTexts = {
    'login': '🔐 Giriş Yapıldı',
    'logout': '🚪 Çıkış Yapıldı',
    'created': '👤 Kullanıcı Oluşturuldu',
    'updated': '✏️ Kullanıcı Güncellendi',
    'deleted': '🗑️ Kullanıcı Silindi',
    'shift_start': '🟢 Vardiya Başladı',
    'shift_end': '🔴 Vardiya Bitti'
  };
  
  const actionText = actionTexts[action] || action;
  const message = `${actionText}\n${userName}`;
  const detailsText = details ? `\n${details}` : '';
  
  toast.success(`${message}${detailsText}\n${new Date().toLocaleTimeString('tr-TR')}`, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

// Firebase menü öğesi işlemleri bildirimi
export const showMenuItemNotification = (action, itemName, details = '') => {
  const actionTexts = {
    'created': '➕ Menü Öğesi Eklendi',
    'updated': '✏️ Menü Öğesi Güncellendi',
    'deleted': '🗑️ Menü Öğesi Silindi',
    'availability_changed': '🔄 Durum Değişti'
  };
  
  const actionText = actionTexts[action] || action;
  const message = `${actionText}\n${itemName}`;
  const detailsText = details ? `\n${details}` : '';
  
  toast.success(`${message}${detailsText}\n${new Date().toLocaleTimeString('tr-TR')}`, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

// Firebase kategori işlemleri bildirimi
export const showCategoryNotification = (action, categoryName, details = '') => {
  const actionTexts = {
    'created': '📁 Kategori Oluşturuldu',
    'updated': '✏️ Kategori Güncellendi',
    'deleted': '🗑️ Kategori Silindi',
    'reordered': '🔄 Sıralama Değişti'
  };
  
  const actionText = actionTexts[action] || action;
  const message = `${actionText}\n${categoryName}`;
  const detailsText = details ? `\n${details}` : '';
  
  toast.success(`${message}${detailsText}\n${new Date().toLocaleTimeString('tr-TR')}`, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

// Firebase bağlantı durumu bildirimi
export const showConnectionNotification = (status) => {
  const statusTexts = {
    'connected': '🟢 Firebase Bağlantısı Kuruldu',
    'disconnected': '🔴 Firebase Bağlantısı Kesildi',
    'reconnecting': '🟡 Yeniden Bağlanıyor...',
    'error': '❌ Bağlantı Hatası'
  };
  
  const statusText = statusTexts[status] || status;
  const time = new Date().toLocaleTimeString('tr-TR');
  
  let toastType = 'info';
  if (status === 'connected') {
    toastType = 'success';
  } else if (status === 'disconnected' || status === 'error') {
    toastType = 'error';
  } else if (status === 'reconnecting') {
    toastType = 'warning';
  }
  
  toast[toastType](`${statusText}\n${time}`, {
    position: "top-left",
    autoClose: status === 'connected' ? 3000 : false, // Bağlantı kesildiğinde otomatik kapanmasın
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    toastId: 'connection-status', // Tek bir bağlantı durumu bildirimi
  });
};

// Genel bildirim
export const showNotification = (message, type = 'info', options = {}) => {
  const defaultOptions = {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };
  
  toast[type](message, { ...defaultOptions, ...options });
};

// Hata bildirimi
export const showErrorNotification = (message, error = null) => {
  const errorDetails = error ? `\nHata: ${error.message || error}` : '';
  const fullMessage = `${message}${errorDetails}`;
  
  toast.error(fullMessage, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

// Başarı bildirimi
export const showSuccessNotification = (message, details = '') => {
  const fullMessage = details ? `${message}\n${details}` : message;
  
  toast.success(fullMessage, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

// Uyarı bildirimi
export const showWarningNotification = (message, details = '') => {
  const fullMessage = details ? `${message}\n${details}` : message;
  
  toast.warning(fullMessage, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

// Firebase işlem başarı/hata bildirimleri
export const showFirebaseNotification = (action, success, details = '') => {
  const actionTexts = {
    'save': 'Kaydetme',
    'update': 'Güncelleme',
    'delete': 'Silme',
    'create': 'Oluşturma',
    'fetch': 'Veri Çekme',
    'upload': 'Yükleme'
  };
  
  const actionText = actionTexts[action] || action;
  const statusText = success ? 'başarılı' : 'başarısız';
  const message = `${actionText} işlemi ${statusText}`;
  
  if (success) {
    showSuccessNotification(message, details);
  } else {
    showErrorNotification(message, details);
  }
}; 