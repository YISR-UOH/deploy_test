import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../../Context/UserContext.jsx";

const ProtectedRoute = ({ children }) => {
  const { user, control } = useContext(UserContext);

  if (control.isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }
  // Si no autenticado, redirige al login
  if (!user.authenticated) {
    return <Navigate to="/" replace />;
  }

  // Si autenticado, renderiza hijos
  return children;
};

export default ProtectedRoute;
