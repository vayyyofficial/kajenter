import { api } from './api';
import { Member, GalleryItem, SocialMedia } from '../types';

interface MembersData {
  guru: Member[];
  siswa: Member[];
  totalGuru: number;
  totalSiswa: number;
  totalMembers: number;
}

class DataCacheService {
  private membersData: MembersData | null = null;
  private galleryData: Map<string, GalleryItem[]> = new Map();
  private allGalleryItems: GalleryItem[] | null = null;
  private socialData: SocialMedia[] | null = null;

  // Timestamps for soft expiration (5 minutes)
  private membersTimestamp = 0;
  private galleryTimestamp: Map<string, number> = new Map();
  private allGalleryTimestamp = 0;
  private socialTimestamp = 0;
  private TTL = 5 * 60 * 1000; // 5 minutes

  // ==========================================
  // MEMBERS CACHE
  // ==========================================
  getMembers(): MembersData | null {
    return this.membersData;
  }

  isMembersFresh(): boolean {
    return this.membersData !== null && Date.now() - this.membersTimestamp < this.TTL;
  }

  async getOrFetchMembers(force = false): Promise<MembersData> {
    if (!force && this.isMembersFresh() && this.membersData) {
      return this.membersData;
    }

    const res = await api.members.getAll();
    if (res.success && res.data) {
      this.membersData = res.data;
      this.membersTimestamp = Date.now();
      return res.data;
    }
    return this.membersData || { guru: [], siswa: [], totalGuru: 0, totalSiswa: 0, totalMembers: 0 };
  }

  // ==========================================
  // GALLERY CACHE
  // ==========================================
  getGallery(category?: string): GalleryItem[] | null {
    const key = category && category !== 'Semua' ? category : 'ALL';
    if (key === 'ALL') {
      return this.allGalleryItems;
    }
    if (this.galleryData.has(key)) {
      return this.galleryData.get(key) || null;
    }
    // If all gallery items are cached, filter client-side for instant response
    if (this.allGalleryItems) {
      return this.allGalleryItems.filter((item) => item.category === category);
    }
    return null;
  }

  isGalleryFresh(category?: string): boolean {
    const key = category && category !== 'Semua' ? category : 'ALL';
    if (key === 'ALL') {
      return this.allGalleryItems !== null && Date.now() - this.allGalleryTimestamp < this.TTL;
    }
    const ts = this.galleryTimestamp.get(key);
    return ts !== undefined && Date.now() - ts < this.TTL;
  }

  async getOrFetchGallery(category?: string, force = false): Promise<GalleryItem[]> {
    const key = category && category !== 'Semua' ? category : 'ALL';

    if (!force && this.isGalleryFresh(category)) {
      const cached = this.getGallery(category);
      if (cached) return cached;
    }

    const res = await api.gallery.getAll(category === 'Semua' ? undefined : category);
    if (res.success && res.data) {
      if (key === 'ALL') {
        this.allGalleryItems = res.data;
        this.allGalleryTimestamp = Date.now();
      } else {
        this.galleryData.set(key, res.data);
        this.galleryTimestamp.set(key, Date.now());
      }
      return res.data;
    }
    return this.getGallery(category) || [];
  }

  // ==========================================
  // SOCIAL CACHE
  // ==========================================
  getSocial(): SocialMedia[] | null {
    return this.socialData;
  }

  isSocialFresh(): boolean {
    return this.socialData !== null && Date.now() - this.socialTimestamp < this.TTL;
  }

  async getOrFetchSocial(force = false): Promise<SocialMedia[]> {
    if (!force && this.isSocialFresh() && this.socialData) {
      return this.socialData;
    }

    const res = await api.social.getActive();
    if (res.success && res.data) {
      this.socialData = res.data;
      this.socialTimestamp = Date.now();
      return res.data;
    }
    return this.socialData || [];
  }

  // ==========================================
  // INVALIDATION
  // ==========================================
  invalidate(type?: 'members' | 'gallery' | 'social' | 'all'): void {
    if (!type || type === 'all') {
      this.membersData = null;
      this.allGalleryItems = null;
      this.galleryData.clear();
      this.socialData = null;
      this.membersTimestamp = 0;
      this.allGalleryTimestamp = 0;
      this.galleryTimestamp.clear();
      this.socialTimestamp = 0;
      return;
    }

    if (type === 'members') {
      this.membersData = null;
      this.membersTimestamp = 0;
    } else if (type === 'gallery') {
      this.allGalleryItems = null;
      this.galleryData.clear();
      this.allGalleryTimestamp = 0;
      this.galleryTimestamp.clear();
    } else if (type === 'social') {
      this.socialData = null;
      this.socialTimestamp = 0;
    }
  }
}

export const dataCache = new DataCacheService();
