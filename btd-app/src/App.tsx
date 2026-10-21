import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
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
import AdminStories from "./pages/AdminStories";
import Understanding from "./pages/Understanding";
import Profile from "./pages/Profile";
import Privacy from "./pages/Privacy";
import Mission from "./pages/Mission";
import MyVoice from "./pages/MyVoice";
import PracticeVisit from "./pages/PracticeVisit";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import AdminMessages from "./pages/AdminMessages";
import Calendar from "./pages/Calendar";
import Me from "./pages/Me";
import Welcome from "./pages/Welcome";
import Join from "./pages/Join";
import { useSetup } from "./context/SetupContext";
import ModeBanner from "./components/ModeBanner";

export default function App() {
  const { pathname } = useLocation();
  // Block body on purpose: newer browsers return a Promise from scrollTo, and
  // React would call any returned value as a cleanup function and crash.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  // A password reset link signs you in so the password can be changed — it
  // must land on the page that changes it, wherever Supabase sent it (it
  // falls back to the home page if /reset-password isn't an allowed
  // redirect). Once only, so someone can still choose to go elsewhere.
  const { passwordRecoveryMode } = useAuth();
  const navigate = useNavigate();
  const sentToReset = useRef(false);
  useEffect(() => {
    if (!passwordRecoveryMode || sentToReset.current) return;
    sentToReset.current = true;
    if (pathname !== "/reset-password") navigate("/reset-password", { replace: true });
  }, [passwordRecoveryMode, pathname, navigate]);

  // Signed in, and never been through the welcome setup (a new account, or
  // one made before it existed): go there first, then on to where they were
  // headed. Once only — finishing or skipping it is remembered.
  const { user } = useAuth();
  const { setup, loaded: setupLoaded } = useSetup();
  const { search } = useLocation();
  useEffect(() => {
    if (!user || !setupLoaded || setup.status || passwordRecoveryMode) return;
    if (["/welcome", "/auth/callback", "/reset-password", "/login"].includes(pathname) || pathname.startsWith("/join")) return;
    navigate(`/welcome?next=${encodeURIComponent(pathname + search)}`, { replace: true });
  }, [user, setupLoaded, setup.status, passwordRecoveryMode, pathname, search, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <AccessibilityBar />
      <Navbar />
      <ModeBanner />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/future" element={<Future />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/appointment-prep" element={<AppointmentPrep />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/my-voice" element={<MyVoice />} />
          <Route path="/my-voice/practice" element={<PracticeVisit />} />
          <Route path="/me" element={<Me />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/join" element={<Join />} />
          <Route path="/join/:code" element={<Join />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/provider-education" element={<ProviderEducation />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/stories/submit" element={<Navigate to="/stories#share" replace />} />
          <Route path="/admin/stories" element={<AdminStories />} />
          <Route path="/understanding-overshadowing" element={<Understanding />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/admin/messages" element={<AdminMessages />} />
          <Route path="/mission" element={<Mission />} />
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
