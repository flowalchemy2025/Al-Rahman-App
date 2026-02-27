# Supabase Setup Guide

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign Up"
3. Sign up using GitHub, Google, or Email
4. Verify your email if required

## Step 2: Create a New Project

1. After logging in, click "New Project"
2. Fill in the project details:
   - **Project Name**: Restaurant Purchase Manager (or any name you prefer)
   - **Database Password**: Create a strong password (save this securely!)
   - **Region**: Choose the region closest to your location
   - **Pricing Plan**: Select Free tier (sufficient for development)
3. Click "Create new project"
4. Wait 2-3 minutes for the project to be set up

## Step 3: Get Your API Credentials

1. Once the project is created, go to **Settings** (gear icon in sidebar)
2. Click on **API** in the settings menu
3. You'll see two important values:
   - **Project URL**: Something like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`
4. Copy both values - you'll need them later

## Step 4: Create Database Tables

1. Go to **SQL Editor** in the left sidebar
2. Click "New Query"
3. Copy and paste the following SQL code:

```sql
-- Create users table
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  full_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Super Admin', 'Worker', 'Vendor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_entries table
CREATE TABLE purchase_entries (
  id BIGSERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  quantity TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  image_filename TEXT,
  worker_id BIGINT REFERENCES users(id),
  vendor_id BIGINT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_mobile ON users(mobile_number);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_purchase_worker ON purchase_entries(worker_id);
CREATE INDEX idx_purchase_vendor ON purchase_entries(vendor_id);
CREATE INDEX idx_purchase_created ON purchase_entries(created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policies for purchase_entries table
CREATE POLICY "Users can view entries they're involved in"
  ON purchase_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.user_id = auth.uid() 
      AND (
        users.id = purchase_entries.worker_id 
        OR users.id = purchase_entries.vendor_id
        OR users.role = 'Super Admin'
      )
    )
  );

CREATE POLICY "Workers and Vendors can insert entries"
  ON purchase_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.user_id = auth.uid() 
      AND (
        users.id = purchase_entries.worker_id 
        OR users.id = purchase_entries.vendor_id
      )
    )
  );

CREATE POLICY "Workers and Vendors can update their entries"
  ON purchase_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.user_id = auth.uid() 
      AND (
        users.id = purchase_entries.worker_id 
        OR users.id = purchase_entries.vendor_id
      )
    )
  );

CREATE POLICY "Workers and Vendors can delete their entries"
  ON purchase_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.user_id = auth.uid() 
      AND (
        users.id = purchase_entries.worker_id 
        OR users.id = purchase_entries.vendor_id
      )
    )
  );
```

4. Click "Run" or press Ctrl+Enter to execute the SQL
5. You should see "Success. No rows returned" message

## Step 5: Configure Your App

1. Open the file `src/services/supabase.js` in your project
2. Replace the placeholder values with your actual credentials:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your Project URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your anon public key
```

Example:
```javascript
const SUPABASE_URL = 'https://abcdefghijk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

3. Save the file

## Step 6: Verify Setup

1. Go back to Supabase Dashboard
2. Click on **Table Editor** in the left sidebar
3. You should see two tables:
   - `users`
   - `purchase_entries`
4. Click on each table to verify the columns are created correctly

## Step 7: Test the Connection

1. Run your app
2. Try to register a new user
3. If successful, go to Supabase Dashboard → **Table Editor** → **users**
4. You should see the newly created user in the table

## Troubleshooting

### Issue: "Invalid API key"
- Double-check that you copied the correct anon public key
- Make sure there are no extra spaces or characters

### Issue: "Network request failed"
- Check your internet connection
- Verify the Project URL is correct
- Make sure you're using https:// in the URL

### Issue: "Row Level Security policy violation"
- The policies are automatically created by the SQL script
- If you still have issues, disable RLS temporarily for testing:
  ```sql
  ALTER TABLE users DISABLE ROW LEVEL SECURITY;
  ALTER TABLE purchase_entries DISABLE ROW LEVEL SECURITY;
  ```

### Issue: "Relation does not exist"
- Make sure you ran the SQL script completely
- Check for any error messages in the SQL Editor

## Additional Configuration (Optional)

### Enable Realtime (for live updates)
1. Go to **Database** → **Replication**
2. Enable replication for both tables

### Set up Storage (if using Supabase storage instead of external API)
1. Go to **Storage**
2. Create a new bucket named "purchase-images"
3. Set it to public
4. Update the image service to use Supabase storage

## Support

If you encounter any issues:
1. Check [Supabase Documentation](https://supabase.com/docs)
2. Visit [Supabase Discord Community](https://discord.supabase.com)
3. Review the error messages in the app console

## Important Notes

- Keep your database password and API keys secure
- Never commit credentials to version control
- For production, consider using environment variables
- Regularly backup your database
- Monitor your usage in the Supabase Dashboard
