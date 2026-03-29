import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WorkerLogin from "./pages/WorkerLogin";
import WorkerPOS from "./pages/WorkerPOS";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminWorkers from "./pages/admin/Workers";
import AdminCategories from "./pages/admin/Categories";
import AdminProducts from "./pages/admin/Products";
import AdminInventory from "./pages/admin/Inventory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();

  useEffect(() => {
    const isAdminPath = location.pathname === '/admin/login' || location.pathname.startsWith('/admin/');
    const manifestPath = isAdminPath ? '/sa-admin.json' : '/sa-worker.json';
    const appTitle = isAdminPath ? 'SA admin' : 'SA worker';

    // Update Manifest Link
    const updateManifest = () => {
      let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (link) {
        if (link.getAttribute('href') !== manifestPath) {
          const newLink = document.createElement('link');
          newLink.rel = 'manifest';
          newLink.href = manifestPath;
          link.parentNode?.replaceChild(newLink, link);
        }
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'manifest';
        newLink.href = manifestPath;
        document.head.appendChild(newLink);
      }
    };

    // Update Meta Tags for iOS/Android
    const updateMetaTags = () => {
      // iOS Home Screen Title
      let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement;
      if (!appleTitle) {
        appleTitle = document.createElement('meta');
        appleTitle.name = 'apple-mobile-web-app-title';
        document.head.appendChild(appleTitle);
      }
      appleTitle.content = appTitle;

      // Android/General App Name
      let appName = document.querySelector('meta[name="application-name"]') as HTMLMetaElement;
      if (!appName) {
        appName = document.createElement('meta');
        appName.name = 'application-name';
        document.head.appendChild(appName);
      }
      appName.content = appTitle;

      // Theme Color
      let themeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      if (!themeColor) {
        themeColor = document.createElement('meta');
        themeColor.name = 'theme-color';
        document.head.appendChild(themeColor);
      }
      themeColor.content = '#000000'; // Match manifest theme_color
    };

    updateManifest();
    updateMetaTags();
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<WorkerLogin />} />
      <Route path="/pos" element={<WorkerPOS />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="workers" element={<AdminWorkers />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="inventory" element={<AdminInventory />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
