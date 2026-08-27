import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { RequireAuth } from './components/RequireAuth'
import { PatientShell } from './pages/patient/PatientShell'
import { TherapistShell } from './pages/therapist/TherapistShell'

/**
 * 双端路由 —— 同一域名两路径（v0.2 §5.2 硬约束）。
 * /patient/*   老人·家属端
 * /therapist/* 康复师端
 * 跨域名部署会导致 localStorage 不互通，联动闭环失效。
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/patient" replace />} />

        <Route
          path="/patient/login"
          element={
            <LoginPage
              role="family"
              title="居家康复助手"
              subtitle="家属登录"
              home="/patient"
              skin="warm"
              hint="忘记密码请联系您的康复师"
            />
          }
        />
        <Route
          path="/patient/*"
          element={
            <RequireAuth role="family" loginPath="/patient/login">
              <PatientShell />
            </RequireAuth>
          }
        />

        <Route
          path="/therapist/login"
          element={
            <LoginPage
              role="therapist"
              title="康复师工作台"
              subtitle="远程随访与指导"
              home="/therapist"
              skin="cool"
              hint="账号由所在机构统一分配"
            />
          }
        />
        <Route
          path="/therapist/*"
          element={
            <RequireAuth role="therapist" loginPath="/therapist/login">
              <TherapistShell />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/patient" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
