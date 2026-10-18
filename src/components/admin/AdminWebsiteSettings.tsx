import React, { useState, useEffect } from 'react';
import { Settings, Save, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { BRANDING } from '../../config/branding';

export const AdminWebsiteSettings: React.FC = () => {
  const { addToast } = useNotifications();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    className: BRANDING.name,
    schoolProgram: `${BRANDING.school} — ${BRANDING.program}`,
    logoUrl: BRANDING.logoUrl,
    classDescription: `Portal resmi kelas unggulan kejuruan ${BRANDING.name} — ${BRANDING.school}.`,
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.admin.getSettings().then((res) => {
      if (res.success && res.data.settings) {
        setFormData({
          className: res.data.settings.class_name || BRANDING.name,
          schoolProgram: res.data.settings.school_program || `${BRANDING.school} — ${BRANDING.program}`,
          logoUrl: res.data.settings.logo_url || BRANDING.logoUrl,
          classDescription: res.data.settings.class_description || `Portal resmi kelas unggulan kejuruan ${BRANDING.name} — ${BRANDING.school}.`,
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.admin.updateSettings({
        className: formData.className,
        schoolProgram: formData.schoolProgram,
        logoUrl: formData.logoUrl,
        classDescription: formData.classDescription,
      });
      addToast('success', t.admin.settingsSaved);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
      {/* Form Settings */}
      <div className="card" style={{ padding: '1.75rem', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Settings size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {t.admin.websiteSettingsTitle}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              {t.admin.websiteSettingsSubtitle}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.admin.classNameLabel}</label>
            <input
              type="text"
              value={formData.className}
              onChange={(e) => setFormData({ ...formData, className: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.admin.schoolProgramLabel}</label>
            <input
              type="text"
              value={formData.schoolProgram}
              onChange={(e) => setFormData({ ...formData, schoolProgram: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.admin.logoUrlLabel}</label>
            <input
              type="text"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              className="form-input"
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
              Default: <code>/assets/Logo-Kelas.png</code>
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.admin.classDescLabel}</label>
            <textarea
              rows={3}
              value={formData.classDescription}
              onChange={(e) => setFormData({ ...formData, classDescription: e.target.value })}
              className="form-textarea"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || loading}
            className="btn btn-primary"
            style={{ height: '44px', fontWeight: 700, marginTop: '0.5rem' }}
          >
            {isSaving || loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isSaving ? t.common.saving : loading ? t.common.loading : t.admin.saveSettingsBtn}</span>
          </button>
        </form>
      </div>

      {/* Centralized Logo & Branding Preview (Requirement #15 & #16) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.75rem', textAlign: 'center', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--primary-600)', fontWeight: 700, fontSize: '0.85rem' }}>
            <Sparkles size={16} />
            <span>{t.admin.brandingPreviewTitle}</span>
          </div>

          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              overflow: 'hidden',
              margin: '0 auto 1.25rem auto',
              border: '4px solid var(--primary-600)',
              boxShadow: 'var(--shadow-md)',
              backgroundColor: '#ffffff',
            }}
          >
            <img
              src={formData.logoUrl}
              alt="Preview Logo Kelas"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallbackLevel) {
                  target.dataset.fallbackLevel = '1';
                  target.src = BRANDING.fallbackLogoUrl;
                }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            {formData.className}
          </h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '1.25rem' }}>
            {formData.schoolProgram}
          </span>

          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              textAlign: 'left',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              lineHeight: 1.55,
            }}
          >
            <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>
              {t.admin.brandingRuleTitle}
            </strong>
            {t.admin.brandingRuleDesc}
          </div>
        </div>
      </div>
    </div>
  );
};
