import { useNavigate } from "react-router-dom";
import { useEffect, useContext } from "react";
import { UserContext } from "../../Context/UserContext";
import Button_Module from "../../Components/buttons/Button_Module";
import styles from "./MenuBar.module.css";

const MenuBar = () => {
  const { user, chat, setChat, setUser } = useContext(UserContext);
  const { isOpen, msgCountUnread } = chat;

  const navigate = useNavigate();
  const isActive = (path) => {
    return location.pathname === `/Cartocor${path}`;
  };
  const handleChatClick = () => {
    setChat({
      isOpen: !chat.isOpen,
      msgCountUnread: chat.msgCountUnread,
    });
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  useEffect(() => {
    if (user.isAuthenticated && !user.logout) {
      navigate("/");
    }
  }, [user]);

  return (
    <div className={styles.menuBar}>
      {user.user_type === 0 && (
        <div
          className={`${styles.menuItem} ${
            isActive("/admin") ? styles.active : ""
          }`}
          onClick={() => handleNavigation("/Cartocor/admin")}
        >
          <span className="menu-icon">⚙️</span>
          <span className="menu-text">Admin</span>
        </div>
      )}

      {user.user_type === 1 && (
        <div
          className={`${styles.menuItem} ${
            isActive("/dashboard") ? styles.active : ""
          }`}
          onClick={() => handleNavigation("/Cartocor/dashboard")}
        >
          <span className="menu-icon">🏠</span>
          <span className="menu-text">Resumen</span>
        </div>
      )}

      {user.user_type === 2 || user.user_type === 1 ? (
        <div
          className={`${styles.menuItem} ${
            isActive("/pautas") ? styles.active : ""
          }`}
          onClick={() => handleNavigation("/Cartocor/pautas")}
        >
          <span className="menu-icon">📋</span>
          <span className="menu-text">Orden</span>
        </div>
      ) : null}

      <div
        className={`${styles.menuItem} ${isOpen ? styles.active : ""}`}
        onClick={() => handleChatClick()}
      >
        <span className="menu-icon">💬</span>
        <span className="menu-text">
          Chat {msgCountUnread > 0 ? msgCountUnread : ""}
        </span>
      </div>

      <div className={`${styles.menuItem}`}>
        <Button_Module styles_color="theme" />
      </div>
      <div
        className={`${styles.menuItem} ${styles.logout}`}
        onClick={() =>
          setUser((prevUser) => ({
            ...prevUser,
            logout: true,
          }))
        }
      >
        <span className="menu-icon">🚪</span>
        <span className="menu-text">Logout</span>
      </div>
    </div>
  );
};
export default MenuBar;
