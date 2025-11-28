import { useEffect, useState } from "react"

export default function MyComponent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/something")
        if (!res.ok) throw new Error("Network error")
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div>Loading…</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

import { useEffect, useState } from "react"

export function useApi(url) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const res = await fetch(url)
        const json = await res.json()
        if (isMounted) setData(json)
      } catch (e) {
        if (isMounted) setError(e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()

    return () => { isMounted = false }
  }, [url])

  return { data, loading, error }
}



const { data, loading, error } = useApi("/api/users")

if (loading) return <>Loading…</>
if (error) return <>Error…</>

return <UserList users={data} />




import useSWR from "swr"

const fetcher = url => fetch(url).then(r => r.json())

export default function MyComponent() {
  const { data, error, isLoading } = useSWR("/api/something", fetcher)

  if (isLoading) return <div>Loading…</div>
  if (error) return <div>Error loading data</div>

  return <div>{data.name}</div>
}


