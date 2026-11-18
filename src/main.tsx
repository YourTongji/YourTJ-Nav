import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import "./index.css"
import { installPersistence } from "./lib/persist"

// 必须在任何组件读设置之前装好，否则首帧读到的是被清空之后的默认值。
installPersistence()

const container = document.getElementById("root")
if (!container) throw new Error("root element missing")

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
