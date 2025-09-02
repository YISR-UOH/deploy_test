import PWABadge from "./PWABadge.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Admin from "./Pages/Admin/Admin.jsx";
import Login from "./Pages/Login/Login.jsx";
import Dashboard from "./Pages/DashBoard/DashBoard.jsx";
import MenuBar from "./Pages/MenuBar/MenuBar.jsx";
import NotFound from "./Pages/NotFound/NotFound.jsx";
import Pautas from "./Pages/Pautas/Pautas.jsx";
import Detalle from "./Pages/Pautas/Components/Supervisor/Detalle.jsx";
import DetalleMant from "./Pages/Pautas/Components/Mantenedor/DetalleMant.jsx";
import ProtectedRoute from "./Components/ProtectedRoute/ProtectedRoute.jsx";
import Notify from "./Components/Notify/Notify.jsx";
import Chat from "./Components/Chat/Chat.jsx";
import PautasMant from "./Pages/Pautas/PautasMant.jsx";
import Tarea from "./Pages/Pautas/Components/Mantenedor/Tarea/Tarea.jsx";
import { useContext } from "react";
import { UserContext } from "./Context/UserContext.jsx";
import { preconnect } from "react-dom";

function App() {
  const { user } = useContext(UserContext);
  preconnect("/api");
  return (
    <BrowserRouter>
      <Notify />
      <Chat />
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="*" element={<NotFound />} />
        <Route
          path="/Cartocor/*"
          element={
            <ProtectedRoute>
              <div className="app-container">
                <div className="app-content">
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route
                      path="pautas"
                      element={
                        user?.user_type == 2 ? <PautasMant /> : <Pautas />
                      }
                    />
                    <Route path="pautas/tarea" element={<Tarea />} />
                    <Route
                      path="pautas/detalle"
                      element={
                        user?.user_type == 2 ? <DetalleMant /> : <Detalle />
                      }
                    />
                    <Route path="admin" element={<Admin />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
                <div className="app-menu">
                  <MenuBar />
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
      <PWABadge />
    </BrowserRouter>
  );
}

export default App;
