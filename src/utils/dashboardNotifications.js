import { toast } from 'react-toastify';

// Ses efekti oluşturma fonksiyonu
const playNotificationSound = () => {
  try {
    // AudioContext ile basit bir bildirim sesi oluştur
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // AudioContext suspended durumundaysa resume et
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Çift ton bildirim sesi (ding-dong tarzı)
    const playTone = (frequency, startTime, duration) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    playTone(800, now, 0.2); // İlk ton
    playTone(600, now + 0.25, 0.2); // İkinci ton
  } catch (error) {
    console.warn('Ses efekti çalınamadı:', error);
  }
};

// Dashboard için Firebase sipariş bildirimi (ses efekti ile)
export const showOrderNotificationWithSound = (tableNumber, orderNumber, items, orderData = {}) => {
  const itemCount = items?.length || 0;
  const totalQuantity = items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
  const totalAmount = orderData.totalAmount || 0;
  const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  
  const message = `🍽️ Yeni Sipariş Alındı!`;
  const details = `Masa ${tableNumber} • Sipariş #${orderNumber}\n${totalQuantity} adet ürün • ${totalAmount > 0 ? `${totalAmount.toLocaleString('tr-TR')} ₺ • ` : ''}${time}`;
  
  toast.success(`${message}\n${details}`, {
    position: "top-right",
    autoClose: 8000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    toastId: `dashboard-order-${orderNumber}`, // Dashboard için özel ID
  });
  
  // Ses efekti çal
  playNotificationSound();
};

// Dashboard için Firebase sipariş durumu değişikliği bildirimi (ses efekti ile)
export const showOrderStatusNotificationWithSound = (tableNumber, orderNumber, status, orderData = {}) => {
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
  const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  
  // Completed durumu için farklı mesaj formatı
  let details;
  if (status === 'completed') {
    details = `Masa ${tableNumber} • ${time}`;
  } else {
    details = `Masa ${tableNumber} • Sipariş #${orderNumber} • ${time}`;
  }
  
  // Duruma göre farklı toast türleri ve ses efektleri
  let toastType = 'info';
  let playSound = true;
  
  if (status === 'ready' || status === 'delivered' || status === 'completed') {
    toastType = 'success';
  } else if (status === 'cancelled') {
    toastType = 'error';
  } else if (status === 'preparing') {
    toastType = 'warning';
  } else if (status === 'pending') {
    playSound = false; // Beklemede durumu için ses çalma
  }
  
  toast[toastType](`${statusText}\n${details}`, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    toastId: `dashboard-status-${orderNumber}-${status}`, // Dashboard için özel ID
  });
  
  // Ses efekti çal (durum değişikliği için daha kısa ses)
  if (playSound) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Duruma göre farklı frekanslar
      let frequency = 600;
      if (status === 'ready') frequency = 800; // Hazır durumu için daha yüksek ses
      else if (status === 'cancelled') frequency = 400; // İptal için daha düşük ses
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (error) {
      console.warn('Ses efekti çalınamadı:', error);
    }
  }
};

// Dashboard için Firebase tablo durumu değişikliği bildirimi
export const showTableStatusNotificationWithSound = (tableNumber, oldStatus, newStatus) => {
  const statusTexts = {
    'available': '🟢 Boş',
    'pending': '🟡 Sipariş Alındı',
    'ordered': '🟡 Sipariş Alındı',
    'preparing': '🟠 Hazırlanıyor',
    'delivered': '🟢 Teslim Edildi'
  };
  
  const oldStatusText = statusTexts[oldStatus] || oldStatus;
  const newStatusText = statusTexts[newStatus] || newStatus;
  const message = `Masa ${tableNumber} durumu değişti`;
  const details = `${oldStatusText} → ${newStatusText}`;
  const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  
  toast.info(`${message}\n${details}\n${time}`, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    toastId: `dashboard-table-${tableNumber}-${newStatus}`,
  });
  
  // Tablo durumu değişikliği için kısa ses
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    console.warn('Ses efekti çalınamadı:', error);
  }
};

// Dashboard için Firebase kullanıcı vardiya bildirimi
export const showShiftNotificationWithSound = (userName, action) => {
  const actionTexts = {
    'shift_start': '🟢 Vardiya Başladı',
    'shift_end': '🔴 Vardiya Bitti'
  };
  
  const actionText = actionTexts[action] || action;
  const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const details = `${userName} • ${time}`;
  
  const toastType = action === 'shift_start' ? 'success' : 'info';
  
  toast[toastType](`${actionText}\n${details}`, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    toastId: `dashboard-shift-${userName}-${action}`,
  });
  
  // Vardiya değişikliği için ses
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const frequency = action === 'shift_start' ? 700 : 500;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.warn('Ses efekti çalınamadı:', error);
  }
};

// Dashboard için Firebase bağlantı durumu bildirimi
export const showConnectionNotificationWithSound = (status) => {
  const statusTexts = {
    'connected': '🟢 Firebase Bağlantısı Kuruldu',
    'disconnected': '🔴 Firebase Bağlantısı Kesildi',
    'reconnecting': '🟡 Yeniden Bağlanıyor...',
    'error': '❌ Bağlantı Hatası'
  };
  
  const statusText = statusTexts[status] || status;
  const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  
  let toastType = 'info';
  let playSound = false;
  
  if (status === 'connected') {
    toastType = 'success';
    playSound = true;
  } else if (status === 'disconnected' || status === 'error') {
    toastType = 'error';
    playSound = true;
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
    toastId: 'dashboard-connection-status',
  });
  
  // Bağlantı durumu için ses
  if (playSound) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequency = status === 'connected' ? 1000 : 300; // Bağlantı kurulduğunda yüksek, kesildiğinde düşük
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Ses efekti çalınamadı:', error);
    }
  }
};

// Dashboard için Firebase sistem uyarıları
export const showSystemAlertWithSound = (alertType, message, details = '') => {
  const alertTexts = {
    'low_stock': '⚠️ Stok Uyarısı',
    'high_demand': '🔥 Yüksek Talep',
    'system_maintenance': '🔧 Sistem Bakımı',
    'backup_completed': '💾 Yedekleme Tamamlandı',
    'update_available': '🔄 Güncelleme Mevcut'
  };
  
  const alertText = alertTexts[alertType] || alertType;
  const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const fullMessage = `${alertText}\n${message}${details ? `\n${details}` : ''}\n${time}`;
  
  let toastType = 'warning';
  if (alertType === 'backup_completed' || alertType === 'update_available') {
    toastType = 'info';
  } else if (alertType === 'high_demand') {
    toastType = 'success';
  }
  
  toast[toastType](fullMessage, {
    position: "top-right",
    autoClose: 6000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    toastId: `dashboard-alert-${alertType}`,
  });
  
  // Sistem uyarıları için ses
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    let frequency = 400;
    if (alertType === 'high_demand') frequency = 800;
    else if (alertType === 'backup_completed') frequency = 600;
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.25);
  } catch (error) {
    console.warn('Ses efekti çalınamadı:', error);
  }
};

// Ses ayarlarını kontrol etme fonksiyonu
export const checkSoundSettings = () => {
  try {
    // Tarayıcı ses desteğini kontrol et
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    return audioContext.state === 'running' || audioContext.state === 'suspended';
  } catch (error) {
    console.warn('Ses desteği kontrol edilemedi:', error);
    return false;
  }
};

// Ses ayarlarını etkinleştirme fonksiyonu
export const enableSound = async () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    return true;
  } catch (error) {
    console.warn('Ses etkinleştirilemedi:', error);
    return false;
  }
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
    toastId: `success-${Date.now()}`, // Benzersiz ID
  });
};

// Hata bildirimi
export const showErrorNotification = (message, details = '') => {
  const fullMessage = details ? `${message}\n${details}` : message;
  
  toast.error(fullMessage, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    toastId: `error-${Date.now()}`, // Benzersiz ID
  });
}; 