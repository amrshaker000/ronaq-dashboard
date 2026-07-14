-- ============================================
-- Ronaq Dashboard — Database Migration
-- Version: 005_allow_public_upload
-- Date: 2026-07-14
-- ============================================

-- Create a storage policy allowing anonymous/public inserts to the product-images bucket under the 'orders/' prefix.
-- This allows storefront users to upload custom sticker designs during checkout.
CREATE POLICY "Allow anonymous inserts to product-images" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = 'orders');
