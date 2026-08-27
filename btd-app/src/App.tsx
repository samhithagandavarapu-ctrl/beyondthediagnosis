import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AccessibilityBar from "./components/AccessibilityBar";
import Home from "./pages/Home";
import Assistant from "./pages/Assistant";
import AppointmentPrep from "./pages/AppointmentPrep";
import Resources from "./pages/Resources";
import ProviderEducation from "./pages/ProviderEducation";
import Stories from "./pages/Stories";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col spotlight-bg">
      <AccessibilityBar />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/appointment-prep" element={<AppointmentPrep />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/provider-education" element={<ProviderEducation />} />
          <Route path="/stories" element={<Stories />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
