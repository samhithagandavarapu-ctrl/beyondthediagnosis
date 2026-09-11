import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AccessibilityBar from "./components/AccessibilityBar";
import Home from "./pages/Home";
import Tools from "./pages/Tools";
import Future from "./pages/Future";
import Assistant from "./pages/Assistant";
import AppointmentPrep from "./pages/AppointmentPrep";
import Resources from "./pages/Resources";
import ProviderEducation from "./pages/ProviderEducation";
import Stories from "./pages/Stories";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import SubmitStory from "./pages/SubmitStory";
import AdminStories from "./pages/AdminStories";
import Understanding from "./pages/Understanding";
import Profile from "./pages/Profile";
import Privacy from "./pages/Privacy";

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <AccessibilityBar />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/future" element={<Future />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/appointment-prep" element={<AppointmentPrep />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/provider-education" element={<ProviderEducation />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/stories/submit" element={<SubmitStory />} />
          <Route path="/admin/stories" element={<AdminStories />} />
          <Route path="/understanding-overshadowing" element={<Understanding />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
