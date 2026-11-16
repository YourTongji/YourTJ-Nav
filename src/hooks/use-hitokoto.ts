import { useCallback, useEffect, useRef, useState } from "react"

export type Quote = { text: string; from?: string; fromWho?: string }

const ENDPOINT = "https://v1.hitokoto.cn/?c=d&c=i&c=k&encode=json"

const fallbacks: Quote[] = [
  { text: "同舟共济，自强不息。", from: "同济校训" },
  { text: "纸上得来终觉浅，绝知此事要躬行。", fromWho: "陆游" },
  { text: "路漫漫其修远兮，吾将上下而求索。", fromWho: "屈原" },
]

type ApiQuote = { hitokoto?: string; from?: string; from_who?: string | null }

export function useHitokoto() {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const id = ++requestId.current
    setStatus("loading")
    try {
      const response = await fetch(ENDPOINT, { cache: "no-store" })
      if (!response.ok) throw new Error(String(response.status))
      const data = (await response.json()) as ApiQuote
      if (id !== requestId.current) return
      if (!data.hitokoto) throw new Error("empty quote")
      setQuote({
        text: data.hitokoto,
        from: data.from,
        fromWho: data.from_who ?? undefined,
      })
      setStatus("ready")
    } catch {
      if (id !== requestId.current) return
      setQuote(fallbacks[Math.floor(Math.random() * fallbacks.length)])
      setStatus("error")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { quote, status, refresh: load }
}
