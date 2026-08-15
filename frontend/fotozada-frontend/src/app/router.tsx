import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminPage } from "@/features/admin/admin-page";
import { ArraialPage } from "@/features/arraial/arraial-page";
import { ArraiaRegallePage } from "@/features/arraia-regalle/arraia-regalle-page";
import { EncontroCarrosPontalPage } from "@/features/encontro-carros-pontal/encontro-carros-pontal-page";
import { LandingPage } from "@/features/landing/landing-page";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/arraia" element={<ArraialPage />} />
        <Route path="/arraia-regalle" element={<ArraiaRegallePage />} />
        <Route path="/carros-pontal" element={<EncontroCarrosPontalPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
