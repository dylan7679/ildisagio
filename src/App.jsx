import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Suspense, lazy } from 'react'
import Layout from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import CookieBanner from './components/CookieBanner'
import OnboardingOverlay from './components/OnboardingOverlay'

const Home = lazy(() => import('./pages/Home'))
const ClassificaPage = lazy(() => import('./pages/ClassificaPage'))
const SubmitPage = lazy(() => import('./pages/SubmitPage'))
const DisagioPage = lazy(() => import('./pages/DisagioPage'))
const Admin = lazy(() => import('./pages/Admin'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))

function PageLoader() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="w-8 h-8 border-2 border-[#ab2d00] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/admin" element={
              <Suspense fallback={<PageLoader />}>
                <Admin />
              </Suspense>
            } />
            <Route path="/" element={<Layout />}>
              <Route index element={
                <Suspense fallback={<PageLoader />}><Home /></Suspense>
              } />
              <Route path="classifica" element={
                <Suspense fallback={<PageLoader />}><ClassificaPage /></Suspense>
              } />
              <Route path="proponi" element={
                <Suspense fallback={<PageLoader />}><SubmitPage /></Suspense>
              } />
              <Route path="disagio/:id" element={
                <Suspense fallback={<PageLoader />}><DisagioPage /></Suspense>
              } />
              <Route path="privacy" element={
                <Suspense fallback={<PageLoader />}><PrivacyPage /></Suspense>
              } />
            </Route>
          </Routes>
          <CookieBanner />
          <OnboardingOverlay />
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  )
}
