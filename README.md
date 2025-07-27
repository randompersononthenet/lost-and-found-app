# Lost & Found App

A React Native mobile application built with Expo for helping users find lost items and return found items to their owners.

## 🚀 Features

### Core Functionality
- **User Authentication** - Secure login/signup with Supabase Auth
- **Post Creation** - Create detailed lost/found item posts with multiple images
- **Feed Display** - Browse all posts with real-time updates
- **Search & Filter** - Advanced search with category filtering
- **Comments System** - Add and view comments on posts
- **Post Management** - Edit and delete your own posts
- **Image Handling** - Multi-image upload with grid display and zoom functionality

### Advanced Features
- **Multi-Image Support** - Upload up to 5 images per post with smart grid layout
- **Image Zoom** - Tap any image to view in full-screen modal
- **Real-time Updates** - Live feed updates and comment notifications
- **Category Filtering** - Filter by lost/found items
- **Location & Date Tracking** - Add location and date information to posts
- **Like System** - Like posts to show support
- **Responsive Design** - Works on both iOS and Android
- **Dark/Light Theme** - Automatic theme switching based on system preference

### Technical Features
- **Offline Support** - Works without internet connection
- **Push Notifications** - Get notified of new posts and comments
- **Image Compression** - Automatic image optimization for faster uploads
- **Secure Storage** - Images stored securely in Supabase Storage
- **Row Level Security** - Database security with RLS policies

## 📱 Screenshots

### Main Screens
- **Feed** - Browse all lost and found posts
- **Create Post** - Add new lost/found items with images
- **Search** - Find specific items with advanced filters
- **Comments** - View and add comments to posts
- **Profile** - Manage your account and posts

## 🛠️ Tech Stack

### Frontend
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **Expo Router** - File-based navigation
- **TypeScript** - Type-safe JavaScript

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL Database
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Storage for images
  - Authentication

### UI/UX Libraries
- **React Native Elements** - UI component library
- **Lucide React Native** - Icon library
- **React Native Toast Message** - Toast notifications
- **Expo Image Picker** - Image selection
- **Expo File System** - File handling

### State Management
- **React Context** - Global state management
- **Supabase Client** - Real-time data synchronization

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g @expo/cli`)
- **Supabase Account** - For backend services
- **iOS Simulator** (for iOS development) or **Android Emulator** (for Android development)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lost-and-found-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Configure Supabase**
   - Create a new Supabase project
   - Set up the database tables (see Database Schema below)
   - Configure storage buckets
   - Set up RLS policies

5. **Start the development server**
   ```bash
   npx expo start
   ```

6. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

## 🗄️ Database Schema

### Tables

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `posts`
```sql
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('lost', 'found')) NOT NULL,
  location TEXT,
  date_lost_found DATE,
  images TEXT[],
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `comments`
```sql
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `likes`
```sql
CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
```

### Storage Buckets
- **post-images** - For storing uploaded post images

### RLS Policies
```sql
-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "Users can view all active posts" ON posts FOR SELECT USING (status = 'active');
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Users can view all comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Users can view all likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can create likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Storage policies
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-images');
CREATE POLICY "Allow public viewing" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
```

## 📁 Project Structure

```
lost-and-found-app/
├── app/                          # Expo Router app directory
│   ├── (tabs)/                   # Tab navigation
│   │   ├── index.tsx            # Feed screen
│   │   ├── create.tsx           # Create post screen
│   │   ├── search.tsx           # Search screen
│   │   └── profile.tsx          # Profile screen
│   ├── auth.tsx                 # Authentication screen
│   ├── comments.tsx             # Comments screen
│   └── edit.tsx                 # Edit post screen
├── components/                   # Reusable components
├── contexts/                    # React Context providers
│   ├── AuthContext.tsx          # Authentication context
│   └── ThemeContext.tsx         # Theme management
├── lib/                         # Utility libraries
│   └── supabase.ts              # Supabase client configuration
├── assets/                      # Static assets
├── app.json                     # Expo configuration
├── package.json                 # Dependencies
└── README.md                    # This file
```

## 🔧 Configuration

### Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### App Configuration
The app is configured in `app.json` with:
- Platform-specific settings for iOS and Android
- Required permissions for camera and photo library access
- Expo plugins configuration

## 🚀 Deployment

### Development
```bash
npx expo start
```

### Production Build
```bash
# For iOS
npx expo build:ios

# For Android
npx expo build:android
```

### EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for both platforms
eas build --platform all
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/your-repo/lost-and-found-app/issues) page
2. Create a new issue with detailed information
3. Include device information, error logs, and steps to reproduce

## 🙏 Acknowledgments

- [Expo](https://expo.dev/) for the amazing development platform
- [Supabase](https://supabase.com/) for the backend services
- [React Native](https://reactnative.dev/) for the mobile framework
- [Lucide](https://lucide.dev/) for the beautiful icons

---

**Made with ❤️ for helping people find their lost items**
