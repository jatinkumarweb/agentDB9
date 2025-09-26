'use client';

import ModelManager from '../../components/ModelManager';
import AppHeader from '../../components/AppHeader';

export default function ModelsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Model Management" showBackButton={true} />
      <ModelManager />
    </div>
  );
}