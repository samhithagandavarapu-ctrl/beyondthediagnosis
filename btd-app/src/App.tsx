import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AccessibilityBar from "./components/AccessibilityBar";
import CalmingScreen from "./components/CalmingScreen";
import Home from "./pages/Home";
import Tools from "./pages/Tools";
import Future from "./pages/Future";
import Assistant from "./pages/Assistant";
import AppointmentPrep from "./pages/AppointmentPrep";
import Resources from "./pages/Resources";
import ProviderEducation from "./pages/ProviderEducation";
import Stories from "./pages/Stories";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import SubmitStory from "./pages/SubmitStory";
import AdminStories from "./pages/AdminStories";
import Understanding from "./pages/Understanding";
import Profile from "./pages/Profile";
import Privacy from "./pages/Privacy";
import MyVoice from "./pages/MyVoice";

export default function App() {
  const { pathname } = useLocation();
  // Block body on purpose: newer browsers return a Promise from scrollTo, and
  // React would call any returned value as a cleanup function and crash.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

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
          <Route path="/my-voice" element={<MyVoice />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/provider-education" element={<ProviderEducation />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/stories/submit" element={<SubmitStory />} />
          <Route path="/admin/stories" element={<AdminStories />} />
          <Route path="/understanding-overshadowing" element={<Understanding />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/privacy" element={<Privacy />} />
          {/* Anything unrecognised — including a provider redirect that lands
              somewhere unexpected — gets a real page, never an empty one. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      {/* App-wide, not part of /my-voice: reachable mid-chat, mid-form, anywhere. */}
      <CalmingScreen />
    </div>
  );
}
