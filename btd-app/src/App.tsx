import { useEffect, useRef, useState } from "react";
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
import Terms from "./pages/Terms";
import { GrownUpsOnly, HealthConsentGate, TermsGate } from "./components/ConsentGates";
import { hasAcceptedTerms } from "./lib/consent";
import AdminShell from "./pages/admin/AdminShell";
import AnnouncementBar from "./components/AnnouncementBar";
import SiteEditor from "./components/SiteEditor";
import BroadcastPopup from "./components/BroadcastPopup";
import { useSiteContent } from "./context/SiteContentContext";
import Icon from "./components/icons/Icon";

// The browser tab's title for each page, so tabs, bookmarks and screen
// readers say where you are.
const TITLES: Record<string, string> = {
  "/tools": "Tools",
  "/future": "What's next",
  "/assistant": "AI Advocate",
  "/appointment-prep": "Appointment Prep",
  "/calendar": "My Calendar",
  "/my-voice": "My Voice",
  "/my-voice/practice": "Practice My Visit",
  "/me": "Me board",
  "/welcome": "Welcome",
  "/join": "Join",
  "/resources": "Resources",
  "/provider-education": "For providers",
  "/stories": "Community Stories",
  "/login": "Sign in",
  "/reset-password": "Reset password",
  "/understanding-overshadowing": "Diagnostic overshadowing",
  "/profile": "My profile",
  "/notifications": "Notifications",
  "/messages": "Messages",
  "/mission": "Our mission",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Use",
  "/admin": "Admin",
  "/admin/messages": "Admin · Messages",
  "/admin/stories": "Admin · Stories",
  "/admin/accounts": "Admin · Accounts",
  "/admin/cleanup": "Admin · Yearly cleanup",
  "/admin/site": "Admin · Site & banners",
  "/admin/broadcasts": "Admin · Broadcasts",
};

// Sign-in steps that work the same for everyone, admins included.
const AUTH_STEPS = ["/auth/callback", "/reset-password"];
const VIEW_SITE_KEY = "voiced:admin-viewing-site";

// Pages someone who hasn't agreed to the terms can still open.
const TERMS_FREE = ["/terms", "/privacy", "/auth/callback", "/reset-password"];

export default function App() {
  const { pathname } = useLocation();
  // Block body on purpose: newer browsers return a Promise from scrollTo, and
  // React would call any returned value as a cleanup function and crash.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const page = TITLES[pathname] ?? (pathname.startsWith("/join/") ? TITLES["/join"] : null);
    document.title = page ? `${page} · Voiced` : "Voiced";
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
  const { user, isAdmin } = useAuth();
  const { setup, loaded: setupLoaded } = useSetup();
  const { search } = useLocation();

  // Admins get their own dashboard instead of the site, until they choose
  // "View site" (remembered for this tab only). Going to any /admin page
  // switches back.
  const [viewingSite, setViewingSite] = useState(() => {
    try {
      return sessionStorage.getItem(VIEW_SITE_KEY) === "1";
    } catch {
      return false;
    }
  });
  function viewSite(on: boolean, go = true) {
    setViewingSite(on);
    try {
      if (on) sessionStorage.setItem(VIEW_SITE_KEY, "1");
      else sessionStorage.removeItem(VIEW_SITE_KEY);
    } catch {
      // Without storage it just lasts until the page reloads.
    }
    if (go) navigate(on ? "/" : "/admin");
  }
  useEffect(() => {
    // Already on an admin page: stay on it.
    if (isAdmin && viewingSite && pathname.startsWith("/admin")) viewSite(false, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, viewingSite, pathname]);
  const adminMode = isAdmin && !viewingSite && !AUTH_STEPS.includes(pathname);
  const { editing, setEditing } = useSiteContent();

  useEffect(() => {
    if (!user || isAdmin || !setupLoaded || setup.status || passwordRecoveryMode) return;
    // The Terms and Privacy Policy stay readable: the agree step links to them.
    if (["/welcome", "/login", ...TERMS_FREE].includes(pathname) || pathname.startsWith("/join")) return;
    navigate(`/welcome?next=${encodeURIComponent(pathname + search)}`, { replace: true });
  }, [user, isAdmin, setupLoaded, setup.status, passwordRecoveryMode, pathname, search, navigate]);

  if (adminMode)
    return (
      <AdminShell
        onViewSite={() => viewSite(true)}
        onEditSite={() => {
          setEditing(true);
          viewSite(true);
        }}
      />
    );

  return (
    <div className="min-h-screen flex flex-col">
      {isAdmin && (
        <div className="bg-butter" data-no-edit>
          <div className="btd-container flex flex-wrap items-center justify-between gap-2 py-2 text-sm font-semibold text-navy">
            {editing ? "Editing the site. Click any words to change them." : "You're looking at the site as everyone else sees it."}
            <span className="flex flex-wrap items-center gap-4">
              <button type="button" onClick={() => setEditing(!editing)} className="inline-flex items-center gap-1.5 font-bold underline">
                <Icon name={editing ? "check" : "refine"} size={16} />
                {editing ? "Done editing" : "Edit words"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  viewSite(false);
                }}
                className="inline-flex items-center gap-1.5 font-bold underline"
              >
                <Icon name="chevron-right" size={16} className="rotate-180" />
                Back to admin
              </button>
            </span>
          </div>
        </div>
      )}
      <AnnouncementBar />
      <AccessibilityBar />
      <Navbar />
      <ModeBanner />
      <main className="flex-1">
        {/* Until the current terms are agreed to, the gate stands in for every
            page except the ones it links to and the sign-in steps. */}
        {user && !isAdmin && !hasAcceptedTerms(user) && !TERMS_FREE.includes(pathname) ? (
          <TermsGate />
        ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/future" element={<Future />} />
          <Route path="/assistant" element={<GrownUpsOnly what="The AI Advocate"><HealthConsentGate><Assistant /></HealthConsentGate></GrownUpsOnly>} />
          <Route path="/appointment-prep" element={<HealthConsentGate><AppointmentPrep /></HealthConsentGate>} />
          <Route path="/calendar" element={<HealthConsentGate><Calendar /></HealthConsentGate>} />
          <Route path="/my-voice" element={<HealthConsentGate><MyVoice /></HealthConsentGate>} />
          <Route path="/my-voice/practice" element={<PracticeVisit />} />
          <Route path="/me" element={<HealthConsentGate><Me /></HealthConsentGate>} />
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
          <Route path="/messages" element={<GrownUpsOnly what="Messaging the Voiced team"><Messages /></GrownUpsOnly>} />
          <Route path="/admin/messages" element={<AdminMessages />} />
          <Route path="/mission" element={<Mission />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          {/* Anything unrecognised — including a provider redirect that lands
              somewhere unexpected — gets a real page, never an empty one. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        )}
      </main>
      <Footer />
      {/* App-wide, not part of /my-voice: reachable mid-chat, mid-form, anywhere. */}
      <CalmingScreen />
      <SiteEditor />
      <BroadcastPopup />
    </div>
  );
}
