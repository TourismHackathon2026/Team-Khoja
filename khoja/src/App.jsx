import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Auth from './pages/Auth'
import PostFound from './pages/PostFound'
import FileLoss from './pages/FileLoss'
import FoundItems from './pages/FoundItems'
import LostReports from './pages/LostReports'
import ItemDetail from './pages/ItemDetail'
import ReportDetail from './pages/ReportDetail'
import Dashboard from './pages/Dashboard'
import SpotterNetwork from './pages/SpotterNetwork'
import ClaimItem from './pages/ClaimItem'

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/post-found" element={<PostFound />} />
                <Route path="/file-loss" element={<FileLoss />} />
                <Route path="/found-items" element={<FoundItems />} />
                <Route path="/lost-reports" element={<LostReports />} />
                <Route path="/found-items/:id" element={<ItemDetail />} />
                <Route path="/lost-reports/:id" element={<ReportDetail />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/spotters" element={<SpotterNetwork />} />
                <Route path="/claim/:id" element={<ClaimItem />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  )
}