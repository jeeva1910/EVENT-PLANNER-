import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Building,
  Phone,
  Tag,
  CheckCircle,
  AlertCircle,
  Save,
  Camera,
  Upload,
  Trash2,
  X,
  Loader2,
  Image as ImageIcon,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { user, updateUserProfile, setUserDirectly } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [organization, setOrganization] = useState(user?.organization || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [interestsStr, setInterestsStr] = useState(user?.interests?.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Profile Picture Upload & Preview State
  const [previewImage, setPreviewImage] = useState<{
    base64: string;
    filename: string;
    fileSizeKB: number;
  } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setDepartment(user.department || '');
      setOrganization(user.organization || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      setInterestsStr(user.interests?.join(', ') || '');
    }
  }, [user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file works
    e.target.value = '';

    // 1. Validate file format: JPG, JPEG, PNG, WEBP
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setNotice({
        message: 'Invalid image format. Supported formats are JPG, PNG, and WebP.',
        type: 'error'
      });
      return;
    }

    // 2. Validate file size: Max 5MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setNotice({
        message: `Image size exceeds the 5MB maximum limit (${(file.size / (1024 * 1024)).toFixed(1)}MB selected).`,
        type: 'error'
      });
      return;
    }

    // 3. Read image for preview
    const reader = new FileReader();
    reader.onload = () => {
      setNotice(null);
      setPreviewImage({
        base64: reader.result as string,
        filename: file.name,
        fileSizeKB: Math.round(file.size / 1024)
      });
    };
    reader.onerror = () => {
      setNotice({ message: 'Failed to read selected image file.', type: 'error' });
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmAvatarUpload = async () => {
    if (!previewImage) return;
    try {
      setUploadingAvatar(true);
      setNotice(null);

      const res = await api.uploadProfilePicture(previewImage.base64, previewImage.filename);

      // Update AuthContext user record immediately
      setUserDirectly(res.user);
      setPreviewImage(null);
      setNotice({
        message: 'Profile picture uploaded and saved to MongoDB successfully!',
        type: 'success'
      });
    } catch (err: any) {
      setNotice({
        message: err.message || 'Failed to upload profile picture to Cloudinary.',
        type: 'error'
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploadingAvatar(true);
      setNotice(null);

      const res = await api.removeProfilePicture();
      setUserDirectly(res.user);
      setNotice({
        message: 'Profile picture removed and reset to default.',
        type: 'success'
      });
    } catch (err: any) {
      setNotice({
        message: err.message || 'Failed to remove profile picture.',
        type: 'error'
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const interests = interestsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateUserProfile({
        name,
        department,
        organization,
        phone,
        bio,
        interests
      });
      setNotice({ message: 'Profile details updated successfully!', type: 'success' });
    } catch (err: any) {
      setNotice({ message: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
  const currentAvatar = user?.profileImage || defaultAvatar;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 font-display">User Profile Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your personal identity, organization affiliations, and profile photo
        </p>
      </div>

      {notice && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Profile Picture Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Profile Photo & Identity
        </h2>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Camera Overlay */}
          <div className="relative group shrink-0">
            <img
              src={currentAvatar}
              alt={user?.name || 'User Profile'}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-slate-200 shadow-md group-hover:opacity-90 transition-all bg-slate-100"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition-transform hover:scale-110 flex items-center justify-center"
              title="Upload new profile picture"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Avatar Details & Actions */}
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg font-bold text-slate-900">{user?.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
                  {user?.role}
                </span>
                {user?.profileImagePublicId && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Cloudinary Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            </div>

            <p className="text-xs text-slate-500">
              Upload a clear JPG, PNG, or WebP photo (up to 5MB). Your avatar is displayed on ticket passes, team rosters, and review discussions.
            </p>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload New Picture</span>
              </button>

              {user?.profileImage && user.profileImage !== defaultAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview & Upload Confirmation Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Preview Profile Picture
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Visual */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <img
                src={previewImage.base64}
                alt="Selected Preview"
                className="w-40 h-40 rounded-3xl object-cover border-4 border-white shadow-md"
              />
              <div className="mt-3 text-center">
                <p className="text-xs font-semibold text-slate-800 truncate max-w-xs">
                  {previewImage.filename}
                </p>
                <span className="text-[11px] text-slate-500 font-mono">
                  {previewImage.fileSizeKB} KB · Formats: JPG, PNG, WebP
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              This photo will be uploaded securely to Cloudinary and saved to your account profile.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewImage(null);
                  fileInputRef.current?.click();
                }}
                disabled={uploadingAvatar}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Choose Different File
              </button>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                disabled={uploadingAvatar}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAvatarUpload}
                disabled={uploadingAvatar}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                {uploadingAvatar ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Confirm & Upload</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Details Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
          Personal & Affiliation Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Organization / College</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Stanford University, Apex Tech"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Branch</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science & Engineering"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Bio / Profile Headline</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell fellow attendees and organizers a little about yourself..."
            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Interests & Topics</label>
          <input
            type="text"
            value={interestsStr}
            onChange={(e) => setInterestsStr(e.target.value)}
            placeholder="AI, Web3, Hackathons, Robotics, Design (comma-separated)"
            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[11px] text-slate-400 mt-1">Separate topic tags with commas</p>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
