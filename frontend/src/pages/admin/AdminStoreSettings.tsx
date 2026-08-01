import React, { useRef, useState, useEffect } from 'react';
import {
  useClearBannerImagesMutation,
  useGetAdminSettingsQuery,
  useUpdateSettingsMutation,
  useUploadBannerImagesMutation,
} from '../../services/settingsApi';

const MAX_BANNERS = 10;

export const AdminStoreSettings: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: settings, isLoading } = useGetAdminSettingsQuery();
  const [uploadBanners, { isLoading: uploading }] = useUploadBannerImagesMutation();
  const [clearBanners, { isLoading: clearing }] = useClearBannerImagesMutation();
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();

  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (settings && !initialized) {
      setStoreName(settings.storeName || '');
      setStoreDescription(settings.storeDescription || '');
      setFreeShippingThreshold(String(settings.freeShippingThreshold || 0));
      setInitialized(true);
    }
  }, [settings, initialized]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_BANNERS);
    setSelectedFiles(files);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
  };

  const handleUploadBanners = async () => {
    if (!selectedFiles.length) {
      alert('Seleccioná al menos una imagen');
      return;
    }
    if (selectedFiles.length > MAX_BANNERS) {
      alert(`Máximo ${MAX_BANNERS} imágenes`);
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('banners', file));

    try {
      await uploadBanners(formData).unwrap();
      setSelectedFiles([]);
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert('Carrusel actualizado. Las imágenes anteriores fueron reemplazadas.');
    } catch (err: any) {
      alert(err?.data?.message || 'Error al subir imágenes');
    }
  };

  const handleClearBanners = async () => {
    if (!confirm('¿Restaurar las imágenes por defecto del carrusel?')) return;
    try {
      await clearBanners().unwrap();
      alert('Carrusel restaurado a imágenes por defecto');
    } catch (err: any) {
      alert(err?.data?.message || 'Error al restaurar carrusel');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings({
        storeName: storeName.trim() || 'Tienda Online',
        storeDescription: storeDescription.trim(),
        freeShippingThreshold: Number(freeShippingThreshold) || 0,
      }).unwrap();
      alert('Configuración guardada');
    } catch (err: any) {
      alert(err?.data?.message || 'Error al guardar');
    }
  };

  const currentBanners = settings?.bannerImages || [];

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="page-title">Tienda online</h1>
        <p className="page-sub">Carrusel del home, textos y promociones</p>
      </div>

      {isLoading ? (
        <div className="text-slate-500 text-sm">Cargando configuración...</div>
      ) : (
        <>
          <section className="card p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Datos de la tienda</h2>
              <p className="text-sm text-slate-500 mt-1">Nombre y descripción visibles en el home</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre de la tienda</label>
                <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              </div>
              <div>
                <label className="label">Umbral envío gratis ($)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={freeShippingThreshold}
                  onChange={(e) => setFreeShippingThreshold(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea
                className="input min-h-[90px]"
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                placeholder="Ej: Tu tienda de instrumentos y audio profesional"
              />
            </div>
            <button type="button" className="btn-primary" onClick={handleSaveSettings} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar datos'}
            </button>
          </section>

          <section className="card p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Carrusel del home</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Hasta {MAX_BANNERS} imágenes. Al subir nuevas, reemplazan todas las actuales.
                </p>
                {settings?.usingDefaultBanners && (
                  <span className="inline-block mt-2 badge-blue text-[10px]">Usando imágenes por defecto</span>
                )}
              </div>
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={handleClearBanners}
                disabled={clearing || settings?.usingDefaultBanners}
              >
                Restaurar defaults
              </button>
            </div>

            {currentBanners.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {currentBanners.map((url, index) => (
                  <div key={`${url}-${index}`} className="aspect-[16/9] rounded-lg overflow-hidden ring-1 ring-white/10">
                    <img src={url} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="border border-dashed border-white/10 rounded-xl p-5 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-500/20 file:text-brand-300 hover:file:bg-brand-500/30"
                onChange={handleFileChange}
              />
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {previewUrls.map((url, index) => (
                    <div key={url} className="aspect-[16/9] rounded-lg overflow-hidden ring-1 ring-brand-500/30">
                      <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={handleUploadBanners}
                disabled={uploading || !selectedFiles.length}
              >
                {uploading ? 'Subiendo...' : `Subir y reemplazar carrusel (${selectedFiles.length || 0}/${MAX_BANNERS})`}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
