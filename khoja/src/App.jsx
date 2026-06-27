import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [status, setStatus] = useState('connecting...')

  useEffect(() => {
    async function test() {
      const { data, error } = await supabase.from('found_items').select('*').limit(1)
      console.log('data:', data)
      console.log('error:', error)
      if (error) setStatus('❌ Error: ' + error.message + ' | Code: ' + error.code)
      else setStatus('✅ Supabase connected!')
    }
    test()
  }, [])

  return <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>{status}</div>
}