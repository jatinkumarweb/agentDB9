'use client';

import React, { useState, Suspense } from 'react';
import { User, Bell, Shield, Key, Trash2, Save } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAuthRedirect, authRedirectConfigs } from '@/hooks/useAuthRedirect';
import ProtectedRoute, { protectionLevels } from '@/components/ProtectedRoute';
import AuthStatus from '@/components/AuthStatus';
import toast from 'react-hot-toast';
import GradientColorPicker from '@/components/dev/GradientColorPicker';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function SettingsContent() {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);

  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    firstName: '',
    lastName: '',
    bio: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    agentUpdates: true,
    systemAlerts: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 30,
    loginAlerts: true,
  });

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Notification settings updated');
    } catch (error) {
      toast.error('Failed to update notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSecurity = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Security settings updated');
    } catch (error) {
      toast.error('Failed to update security settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Account deleted successfully');
      logout();
    } catch (error) {
      toast.error('Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'api', label: 'API Keys', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 relative overflow-hidden">
      {/* Animated Liquid Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="blob blob-4"></div>
      </div>

      {/* Noise Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-white/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Settings</h1>
            <AuthStatus />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-4 border border-white/20">
              <ul className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                          activeTab === tab.id
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                            : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {tab.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/20">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                        className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio
                      </label>
                      <textarea
                        rows={4}
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Notification Preferences</h2>
                  <div className="space-y-4">
                    {Object.entries(notificationSettings).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Receive notifications for this category
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => setNotificationSettings({
                              ...notificationSettings,
                              [key]: e.target.checked
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-600 peer-checked:to-purple-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={handleSaveNotifications}
                      disabled={isLoading}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Security Settings</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securitySettings.twoFactorEnabled}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            twoFactorEnabled: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Session Timeout (minutes)
                      </label>
                      <select
                        value={securitySettings.sessionTimeout}
                        onChange={(e) => setSecuritySettings({
                          ...securitySettings,
                          sessionTimeout: parseInt(e.target.value)
                        })}
                        className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                        <option value={480}>8 hours</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Login Alerts</h3>
                        <p className="text-sm text-gray-500">Get notified when someone logs into your account</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securitySettings.loginAlerts}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            loginAlerts: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={handleSaveSecurity}
                      disabled={isLoading}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* API Keys Tab */}
              {activeTab === 'api' && (
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">API Keys</h2>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                      API keys allow you to access AgentDB9 programmatically. Keep your keys secure and never share them publicly.
                    </p>
                  </div>
                  <div className="text-center py-8">
                    <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No API Keys</h3>
                    <p className="text-gray-500 mb-4">You haven&apos;t created any API keys yet.</p>
                    <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
                      Create API Key
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="mt-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border-l-4 border-red-500">
              <div className="p-6">
                <h2 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h2>
                <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-red-900">Delete Account</h3>
                      <p className="text-sm text-red-700">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isLoading}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:shadow-lg disabled:opacity-50 transition-all"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gradient Color Picker */}
      {showGradientPicker && <GradientColorPicker />}

      {/* Animation Keyframes */}
      <style jsx global>{`
        @keyframes blob-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes blob-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(0.9); }
          66% { transform: translate(30px, -30px) scale(1.1); }
        }
        @keyframes blob-float-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, 40px) scale(1.1); }
          66% { transform: translate(-30px, -20px) scale(0.9); }
        }
        @keyframes blob-float-4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-35px, -40px) scale(0.9); }
          66% { transform: translate(35px, 30px) scale(1.1); }
        }

        .blob {
          position: absolute;
          border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
          opacity: 0.15;
          filter: blur(40px);
          will-change: transform;
        }

        .blob-1 {
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          top: -10%;
          left: -10%;
          animation: blob-float-1 28s ease-in-out infinite;
        }

        .blob-2 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          top: 40%;
          right: -5%;
          animation: blob-float-2 32s ease-in-out infinite;
        }

        .blob-3 {
          width: 450px;
          height: 450px;
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          bottom: -10%;
          left: 20%;
          animation: blob-float-3 30s ease-in-out infinite;
        }

        .blob-4 {
          width: 350px;
          height: 350px;
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          bottom: 30%;
          right: 20%;
          animation: blob-float-4 25s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function SettingsPageContent() {
  // Protect this route - require authentication
  useAuthRedirect(authRedirectConfigs.protected);

  return (
    <ProtectedRoute {...protectionLevels.authenticated}>
      <SettingsContent />
    </ProtectedRoute>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}