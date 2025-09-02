import Button_Module from "../../Components/buttons/Button_Module";
import styles from "./Login.module.css";
import { UserContext } from "../../Context/UserContext";
import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ServerContext } from "../../Context/ServerContext.jsx";

const Login = () => {
  const { user, setNotifyData, setUser } = useContext(UserContext);
  const { login, setServer, server } = useContext(ServerContext);

  const navigate = useNavigate();

  useEffect(() => {
    if (user.authenticated && server.token) {
      switch (user.user_type) {
        case 0:
          navigate("/Cartocor/admin");
          break;
        case 1:
          navigate("/Cartocor/dashboard");
          break;
        case 2:
          navigate("/Cartocor/pautas");
          break;
        default:
          setUser((prevUser) => ({ ...prevUser, logout: true }));
          alert("Tipo de usuario no reconocido. Contacte al administrador.");
          break;
      }
    }
  }, [user, server]);
  const handleLogin = async () => {
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;

    if (!username || !password) {
      setNotifyData({
        title: "Error",
        message: "Por favor ingrese su usuario y contraseña.",
        type_notification: "error",
        duration: 3000,
        active: true,
      });
      return;
    }
    const data = await login(username, password);
    if (data) {
      setUser((prevUser) => ({
        ...prevUser,
        name: data.user.nombre,
        code: data.user.code,
        user_type: data.user.tipo_usuario_id,
        specialty_id: data.user.especialidad_id,
        authenticated: true,
        token: data.access_token,
        themePreference: data.user.theme === 0 ? "light" : "dark",
      }));
      setServer((prevServer) => ({
        ...prevServer,
        token: data.access_token,
      }));
      document.documentElement.setAttribute(
        "data-theme",
        data.user.theme === 0 ? "light" : "dark"
      );
    }
    username = document.getElementById("username").value = "";
    password = document.getElementById("password").value = "";
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.themeToggleContainer}>
        <Button_Module styles_color="theme" />
      </div>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>Iniciar Sesión</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          autoComplete="off"
          className={styles.loginForm}
        >
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.formLabel}>
              Usuario:
            </label>
            <input
              type="text"
              id="username"
              className={styles.formInput}
              placeholder="Ingresar Nombre de Usuario"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Contraseña:
            </label>
            <input
              type="password"
              id="password"
              className={styles.formInput}
              placeholder="Ingresar Contraseña"
              required
            />
          </div>
        </form>
        <div className={styles.submitButton}>
          <Button_Module
            type="submit"
            label="Iniciar Sesión"
            styles_color="blue"
            click={handleLogin}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
