import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function setupStorage() {
  console.log('Setting up Supabase Storage...')
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  
  if (listError) {
    console.error('Failed to list buckets:', listError)
    process.exit(1)
  }
  
  const workspaceBucket = buckets.find(b => b.name === 'workspace')
  
  if (workspaceBucket) {
    console.log('Bucket "workspace" already exists.')
    // Ensure it's public
    if (!workspaceBucket.public) {
        await supabase.storage.updateBucket('workspace', { public: true })
        console.log('Updated bucket "workspace" to be public.')
    }
  } else {
    console.log('Creating "workspace" bucket...')
    const { data, error } = await supabase.storage.createBucket('workspace', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'],
      fileSizeLimit: 5242880, // 5MB
    })
    
    if (error) {
      console.error('Failed to create bucket:', error)
      process.exit(1)
    }
    
    console.log('Successfully created "workspace" bucket!')
  }
  
  console.log('Storage setup complete.')
}

setupStorage()
