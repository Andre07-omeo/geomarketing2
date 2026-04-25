/** @type {import('next').NextConfig} */
const nextConfig = {
  // ❌ Supprimez output: 'export'
  images: {
    // ✅ Autorisez Cloudinary pour vos logos
    domains: ['res.cloudinary.com'], 
    // Gardez unoptimized à true seulement si vous avez des problèmes de quota d'images
    unoptimized: true, 
  },
}

module.exports = nextConfig