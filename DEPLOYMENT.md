# RECALL Admin Panel - Vercel Deployment Guide

This guide will help you deploy the RECALL admin panel to Vercel from this monorepo structure.

## 📋 Prerequisites

- [Vercel account](https://vercel.com)
- [GitHub repository](https://github.com) (or GitLab/Bitbucket)
- Supabase project with admin access

## 🚀 Deployment Steps

### 1. Prepare Your Repository

The repository is already configured with:
- ✅ `vercel.json` configuration file
- ✅ Admin panel build scripts
- ✅ Environment variable templates
- ✅ Vite configuration for production

### 2. Set Up Environment Variables

**IMPORTANT**: Environment variables are set in the Vercel dashboard, NOT in the `vercel.json` file.

In your Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add these variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**To get these values:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the Project URL and anon/public key

**Note**: Make sure to add these variables for all environments (Production, Preview, Development).

### 3. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: Leave empty (use root)
   - **Build Command**: `cd admin && npm install && npm run build`
   - **Output Directory**: `admin/dist`
   - **Install Command**: Leave empty (combined with build command)
5. Add environment variables (see step 2)
6. Click "Deploy"

#### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to your project root
cd /path/to/lost-and-found-app

# Deploy
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set root directory to "admin"
# - Add environment variables
```

### 4. Configure Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Navigate to Settings → Domains
3. Add your custom domain (e.g., `admin.yourdomain.com`)
4. Configure DNS records as instructed

## 🔧 Configuration Details

### Vercel Configuration (`vercel.json`)
```json
{
  "version": 2,
  "buildCommand": "cd admin && npm install && npm run build",
  "outputDirectory": "admin/dist",
  "routes": [
    {
      "src": "/admin/(.*)",
      "dest": "/admin/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/admin/$1"
    }
  ]
}
```

### Build Configuration
- **Build Command**: `cd admin && npm install && npm run build`
- **Output Directory**: `admin/dist`
- **Install Command**: Combined with build command

## 🛠️ Local Testing

Before deploying, test the build locally:

```bash
# Navigate to admin directory
cd admin

# Install dependencies
npm install

# Create .env file with your Supabase credentials
cp .env.example .env
# Edit .env with your actual values

# Test development server (runs on http://localhost:5174)
npm run dev

# Build for production
npm run build

# Preview the build
npm run preview
```

### Local Development Notes
- **Development server**: Runs on `http://localhost:5174` with base path `/`
- **Production build**: Uses base path `/admin/` for Vercel deployment
- **Routing**: The app automatically redirects `/admin/` to `/` in development mode

## 🔐 Security Considerations

### Environment Variables
- Never commit `.env` files to version control
- Use Vercel's environment variable system for production
- Rotate Supabase keys regularly

### Supabase RLS (Row Level Security)
- Ensure your Supabase RLS policies are properly configured
- Test admin access with your production database
- Review the `admin-roles-rls.sql` file for proper permissions

## 📱 Accessing the Admin Panel

After deployment, your admin panel will be available at:
- **Vercel URL**: `https://your-project.vercel.app`
- **Custom Domain**: `https://admin.yourdomain.com` (if configured)

### Admin Login
1. Navigate to your deployed admin panel
2. Use an admin account from your Supabase `profiles` table
3. Ensure the user has `role = 'admin'` in the database

## 🔄 Continuous Deployment

Once connected to Vercel:
- Every push to your main branch will trigger a new deployment
- Pull requests will create preview deployments
- You can configure branch-specific deployments in Vercel settings

## 🐛 Troubleshooting

### Build Failures
```bash
# Check build logs in Vercel dashboard
# Common issues:
# - Missing environment variables
# - TypeScript errors
# - Missing dependencies
# - Terser minification errors (fixed by using esbuild)
```

**Terser Error Fix:**
If you see "terser not found" error, the build configuration uses `esbuild` for minification instead of `terser` to avoid dependency issues.

**Local Development Routing:**
If you see "No routes matched location '/admin/'" when running locally, this is normal. The app uses conditional base paths:
- Development: base path `/` (access at `http://localhost:5174`)
- Production: base path `/admin/` (for Vercel deployment)
- Routes automatically redirect `/admin/` to `/` in development mode

**Package.json Not Found Error:**
If you see "Could not read package.json: Error: ENOENT: no such file or directory, open '/vercel/path0/admin/package.json'":
- Ensure the `admin` directory is included in your repository
- Check that `vercel.json` uses the correct build command: `cd admin && npm install && npm run build`
- Remove any `.vercelignore` file that might be excluding the admin directory
- Verify the admin directory structure is correct

### Runtime Errors
```bash
# Check browser console for errors
# Common issues:
# - Incorrect Supabase URL/key
# - CORS issues
# - RLS policy problems
```

### Database Connection Issues
1. Verify Supabase URL and key in environment variables
2. Check Supabase project status
3. Review RLS policies for admin access
4. Ensure admin user exists in profiles table

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review browser console for errors
3. Verify Supabase configuration
4. Test locally with production environment variables

## 🎉 Success!

Once deployed, you'll have a fully functional admin panel for managing your RECALL lost & found application with:
- ✅ Modern, responsive UI
- ✅ Real-time data management
- ✅ Secure authentication
- ✅ Automated deployments
- ✅ Professional admin experience
