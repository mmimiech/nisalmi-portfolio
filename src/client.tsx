/// <reference types="vite/client" />

import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter } from './router'

// อิมพอร์ตไฟล์ CSS หลัก (หากในโปรเจกต์ใช้ชื่อ index.css ให้เปลี่ยนเป็น './index.css')
import './styles.css'

// เรียกใช้งาน getRouter() ตามที่กำหนดไว้ใน router.tsx
const router = getRouter()

const rootElement = document.getElementById('root')

if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  )
}