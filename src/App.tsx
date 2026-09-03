import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
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
        {/* 根路径给角色选择页。此前直接跳 /patient，等于把家属端当成整站门面，
            康复师端在线上没有入口，只能手输地址。 */}
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/patient/login"
          element={
            <LoginPage
              role="family"
              title="银康安馨"
              subtitle="居家康复智能助手 · 老人／家属登录"
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
              title="银康安馨"
              subtitle="康复师工作台 · 远程随访与指导"
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
