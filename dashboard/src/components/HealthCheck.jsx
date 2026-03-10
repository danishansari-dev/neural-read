import React from 'react';

export default function HealthCheck() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) console.error('NeuralRead: Missing VITE_SUPABASE_URL');
  return null;
}