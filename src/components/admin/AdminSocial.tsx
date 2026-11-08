import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { SocialMedia } from '../../types';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useNotifications } from '../../context/NotificationContext';
import { useRealtimeSync } from '../../context/SyncContext';
import { useLanguage } from '../../context/LanguageContext';
import { dataCache } from '../../services/dataCache';

export const AdminSocial: React.FC = () => {
  const { addToast } = useNotifications();
  const { t } = useLanguage();
  const [socials, setSocials] = useState<SocialMedia[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SocialMedia | null>(null);
  const [formData, setFormData] = useState({
    platform: 'Instagram',
    username: '',
    url: '',
    icon: 'Instagram',
    isActive: true,
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSocials = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.social.getAll();
      if (res.success) setSocials(res.data);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load social media.');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSocials();
  }, [fetchSocials]);

  // Multi-user real-time sync for social media updates
  useRealtimeSync(['social'], () => {
    fetchSocials();
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      platform: 'Instagram',
      username: '@xicp.tkj',
      url: 'https://instagram.com/xicp.tkj',
      icon: 'Instagram',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: SocialMedia) => {
    setEditingItem(item);
    setFormData({
      platform: item.platform,
      username: item.username,
      url: item.url,
      icon: item.icon,
      isActive: item.is_active === 1,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.platform || !formData.username || !formData.url) {
      addToast('error', 'Platform, username, and URL are required.');
      return;
    }

    try {
      if (editingItem) {
        await api.social.update(editingItem.id, formData);
        addToast('success', t.admin.saveSocialSuccess);
      } else {
        await api.social.create(formData);
        addToast('success', t.admin.saveSocialSuccess);
      }
      dataCache.invalidate('social');
      setIsModalOpen(false);
      fetchSocials();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save social media.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await api.social.delete(deleteId);
      dataCache.invalidate('social');
      addToast('success', t.admin.deleteSocialSuccess);
      setDeleteId(null);
      fetchSocials();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete social media.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{t.admin.socialTitle}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {t.admin.socialSubtitle}
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>{t.admin.addSocialBtn}</span>
        </button>
      </div>

      <div className="card" style={{ boxShadow: 'var(--shadow-md)', backgroundColor: 'var(--bg-card)' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t.admin.colSocialPlatform}</th>
                <th>{t.admin.colSocialUsername}</th>
                <th>{t.admin.colSocialUrl}</th>
                <th>{t.admin.colSocialStatus}</th>
                <th style={{ textAlign: 'center' }}>{t.admin.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    {t.common.loading}
                  </td>
                </tr>
              ) : socials.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    {t.admin.emptySocial}
                  </td>
                </tr>
              ) : (
                socials.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong style={{ color: 'var(--text-main)' }}>{s.platform}</strong>
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                        {s.username}
                      </span>
                    </td>
                    <td>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}
                      >
                        <span>{s.url}</span>
                        <ExternalLink size={13} />
                      </a>
                    </td>
                    <td>
                      {s.is_active === 1 ? (
                        <span className="badge badge-success">{t.admin.statusActive}</span>
                      ) : (
                        <span className="badge badge-neutral">{t.admin.statusInactive}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button onClick={() => handleOpenEdit(s)} className="btn-icon" style={{ padding: '0.35rem' }} title={t.admin.edit}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeleteId(s.id)} className="btn-icon" style={{ color: 'var(--danger-main)', padding: '0.35rem' }} title={t.admin.delete}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? t.admin.editSocialTitle : t.admin.addSocialTitle}
        size="sm"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">{t.admin.socialPlatformLabel}</label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="form-select"
              required
            >
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="GitHub">GitHub</option>
              <option value="Discord">Discord</option>
              <option value="Twitter / X">Twitter / X</option>
              <option value="Email Resmi">Email Resmi</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t.admin.socialUsernameLabel}</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="form-input"
              placeholder="@xicp.tkj"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.admin.socialUrlLabel}</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="form-input"
              placeholder="https://instagram.com/xicp.tkj"
              required
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: 'var(--primary-600)' }}
            />
            <label htmlFor="isActiveCheck" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
              {t.admin.socialActiveLabel}
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              {t.common.cancel}
            </button>
            <button type="submit" className="btn btn-primary">
              {t.admin.saveSocialBtn}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t.admin.confirmDeleteTitle}
        message={t.admin.confirmDeleteSocialMsg}
        isLoading={isDeleting}
      />
    </div>
  );
};
