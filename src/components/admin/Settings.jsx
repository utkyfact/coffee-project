import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { FiSave, FiSettings, FiCoffee, FiDroplet } from 'react-icons/fi';

// Ayarlar bileşeni
const Settings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Kafe ayarları
  const [cafeSettings, setCafeSettings] = useState({
    name: 'Kahve Dükkanı',
    address: 'İstanbul, Türkiye',
    phone: '+90 212 345 67 89',
    email: 'info@kahvedukkani.com',
    workingHours: '09:00 - 22:00',
    description: '',
    website: '',
    socialMedia: {
      instagram: '',
      facebook: '',
      twitter: ''
    }
  });

  // Tema ayarları
  const [themeSettings, setThemeSettings] = useState({
    darkMode: false,
    primaryColor: 'blue',
    fontSize: 'medium'
  });

  // Firebase'den ayarları çek
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);

        // Kafe ayarlarını çek
        const cafeDoc = doc(db, 'settings', 'cafe');
        const unsubscribeCafe = onSnapshot(cafeDoc, (doc) => {
          if (doc.exists()) {
            setCafeSettings(prev => ({ ...prev, ...doc.data() }));
          }
        });

        // Tema ayarlarını çek
        const themeDoc = doc(db, 'settings', 'theme');
        const unsubscribeTheme = onSnapshot(themeDoc, (doc) => {
          if (doc.exists()) {
            setThemeSettings(prev => ({ ...prev, ...doc.data() }));
          }
        });

        setIsLoading(false);

        return () => {
          unsubscribeCafe();
          unsubscribeTheme();
        };
      } catch (error) {
        console.error('Ayarlar yüklenirken hata:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Kafe ayarlarını kaydet
  const handleSaveCafeSettings = async () => {
    try {
      setIsSaving(true);

      const cafeDoc = doc(db, 'settings', 'cafe');
      await setDoc(cafeDoc, {
        ...cafeSettings,
        updatedAt: new Date()
      });

      alert('Kafe ayarları başarıyla kaydedildi!');
    } catch (error) {
      console.error('Kafe ayarları kaydedilirken hata:', error);
      alert('Kafe ayarları kaydedilirken bir hata oluştu: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Tema ayarlarını kaydet
  const handleSaveThemeSettings = async () => {
    try {
      setIsSaving(true);

      const themeDoc = doc(db, 'settings', 'theme');
      await setDoc(themeDoc, {
        ...themeSettings,
        updatedAt: new Date()
      });

      // Tema değişikliklerini uygula
      if (themeSettings.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }

      alert('Tema ayarları başarıyla kaydedildi!');
    } catch (error) {
      console.error('Tema ayarları kaydedilirken hata:', error);
      alert('Tema ayarları kaydedilirken bir hata oluştu: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Input değişikliklerini handle et
  const handleCafeInputChange = (e) => {
    const { name, value } = e.target;
    setCafeSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSocialMediaChange = (platform, value) => {
    setCafeSettings(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value
      }
    }));
  };

  const handleThemeInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setThemeSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">Ayarlar yükleniyor...</span>
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Ayarlar</h2>
          <p className="text-base-content/70">Kafe ve tema ayarlarını yönetin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Kafe Bilgileri */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">
              <FiCoffee className="mr-2" />
              Kafe Bilgileri
            </h3>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Kafe Adı</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className="input input-bordered w-full"
                  value={cafeSettings.name}
                  onChange={handleCafeInputChange}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Açıklama</span>
                </label>
                <textarea
                  name="description"
                  className="textarea textarea-bordered w-full"
                  value={cafeSettings.description}
                  onChange={handleCafeInputChange}
                  rows="3"
                  placeholder="Kafe hakkında kısa açıklama..."
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Adres</span>
                </label>
                <textarea
                  name="address"
                  className="textarea textarea-bordered w-full"
                  value={cafeSettings.address}
                  onChange={handleCafeInputChange}
                  rows="2"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Telefon</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  className="input input-bordered w-full"
                  value={cafeSettings.phone}
                  onChange={handleCafeInputChange}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">E-posta</span>
                </label>
                <input
                  type="email"
                  name="email"
                  className="input input-bordered w-full"
                  value={cafeSettings.email}
                  onChange={handleCafeInputChange}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Website</span>
                </label>
                <input
                  type="url"
                  name="website"
                  className="input input-bordered w-full"
                  value={cafeSettings.website}
                  onChange={handleCafeInputChange}
                  placeholder="https://example.com"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Çalışma Saatleri</span>
                </label>
                <input
                  type="text"
                  name="workingHours"
                  className="input input-bordered w-full"
                  value={cafeSettings.workingHours}
                  onChange={handleCafeInputChange}
                  placeholder="09:00 - 22:00"
                />
              </div>

              {/* Sosyal Medya */}
              <div className="space-y-3">
                <label className="label">
                  <span className="label-text font-medium">Sosyal Medya</span>
                </label>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Instagram</span>
                  </label>
                  <input
                    type="url"
                    className="input input-bordered w-full"
                    value={cafeSettings.socialMedia.instagram}
                    onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                    placeholder="https://instagram.com/username"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Facebook</span>
                  </label>
                  <input
                    type="url"
                    className="input input-bordered w-full"
                    value={cafeSettings.socialMedia.facebook}
                    onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                    placeholder="https://facebook.com/pagename"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Twitter</span>
                  </label>
                  <input
                    type="url"
                    className="input input-bordered w-full"
                    value={cafeSettings.socialMedia.twitter}
                    onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                    placeholder="https://twitter.com/username"
                  />
                </div>
              </div>
            </div>

            <div className="card-actions justify-end mt-6">
              <button
                className="btn btn-primary"
                onClick={handleSaveCafeSettings}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2" />
                    Kaydet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tema Ayarları */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">
              <FiDroplet className="mr-2" />
              Tema Ayarları
            </h3>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Koyu Tema</span>
                  <input
                    type="checkbox"
                    name="darkMode"
                    className="toggle toggle-primary"
                    checked={themeSettings.darkMode}
                    onChange={handleThemeInputChange}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Ana Renk</span>
                </label>
                <select
                  name="primaryColor"
                  className="select select-bordered w-full"
                  value={themeSettings.primaryColor}
                  onChange={handleThemeInputChange}
                >
                  <option value="blue">Mavi</option>
                  <option value="green">Yeşil</option>
                  <option value="red">Kırmızı</option>
                  <option value="purple">Mor</option>
                  <option value="orange">Turuncu</option>
                  <option value="pink">Pembe</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Yazı Boyutu</span>
                </label>
                <select
                  name="fontSize"
                  className="select select-bordered w-full"
                  value={themeSettings.fontSize}
                  onChange={handleThemeInputChange}
                >
                  <option value="small">Küçük</option>
                  <option value="medium">Orta</option>
                  <option value="large">Büyük</option>
                </select>
              </div>

              {/* Tema Önizleme */}
              <div className="mt-6 p-4 bg-base-200 rounded-lg">
                <h4 className="font-semibold mb-2">Tema Önizleme</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary rounded"></div>
                    <span className="text-sm">Ana Renk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-secondary rounded"></div>
                    <span className="text-sm">İkincil Renk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-accent rounded"></div>
                    <span className="text-sm">Vurgu Rengi</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-actions justify-end mt-6">
              <button
                className="btn btn-primary"
                onClick={handleSaveThemeSettings}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2" />
                    Kaydet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sistem Bilgileri */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">
            <FiSettings className="mr-2" />
            Sistem Bilgileri
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat">
              <div className="stat-title">Uygulama Versiyonu</div>
              <div className="stat-value text-lg">1.0.0</div>
              <div className="stat-desc">Firebase entegrasyonu</div>
            </div>

            <div className="stat">
              <div className="stat-title">Son Güncelleme</div>
              <div className="stat-value text-lg">
                {new Date().toLocaleDateString('tr-TR')}
              </div>
              <div className="stat-desc">Bugün</div>
            </div>

            <div className="stat">
              <div className="stat-title">Veritabanı</div>
              <div className="stat-value text-lg">Firebase</div>
              <div className="stat-desc">Firestore</div>
            </div>

            <div className="stat">
              <div className="stat-title">Durum</div>
              <div className="stat-value text-lg text-success">Aktif</div>
              <div className="stat-desc">Tüm sistemler çalışıyor</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 