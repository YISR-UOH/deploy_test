import { useEffect, useState } from "react";
import styles from "./Admin.module.css";
import UserView from "./Components/UserView.jsx";
import SpecialityView from "./Components/SpecialityView.jsx";
import OrderView from "./Components/OrderView.jsx";

const Admin = () => {
  const [selectedContent, setSelectedContent] = useState("users");
  const [content, setContent] = useState(null);

  const handleContent = (view) => {
    if (selectedContent !== view) {
      setSelectedContent(view);
    }
  };
  const isActive = (actualContent) => {
    return selectedContent === actualContent;
  };

  useEffect(() => {
    const loadContent = async () => {
      switch (selectedContent) {
        case "users":
          setContent(<UserView />);
          break;
        case "specialities":
          setContent(<SpecialityView />);
          break;
        case "orders":
          try {
            setContent(<OrderView />);
          } catch (error) {
            console.error("Error loading orders:", error);
            setContent(<p>Error al cargar órdenes</p>);
          }
          break;
        default:
          setContent(null);
      }
    };

    loadContent();
  }, [selectedContent]);

  return (
    <div className={styles.adminContainer}>
      <div className={styles.headerSection}>
        <h1>Panel de Administración</h1>
        <p>Gestiona usuarios, especialidades y órdenes de trabajo</p>
      </div>

      <div className={styles.crudContainer}>
        <div className={styles.menuCrud}>
          <div
            className={`${styles.menuCrudItem} ${
              isActive("users") ? styles.active : ""
            }`}
            onClick={() => {
              handleContent("users");
            }}
          >
            👥 Usuarios
          </div>
          <div
            className={`${styles.menuCrudItem} ${
              isActive("specialities") ? styles.active : ""
            }`}
            onClick={() => {
              handleContent("specialities");
            }}
          >
            🔧 Especialidades
          </div>
          <div
            className={`${styles.menuCrudItem} ${
              isActive("orders") ? styles.active : ""
            }`}
            onClick={() => {
              handleContent("orders");
            }}
          >
            📋 Pautas
          </div>
        </div>
        <div className={styles.crudContent}>
          {content ? (
            content
          ) : (
            <div className={styles.placeholderContent}>
              <h3>Seleccione una opción del menú</h3>
              <p>
                Escoja una categoría para ver y gestionar los elementos
                correspondientes.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.dashboardSection}>
        <h2>Estadísticas Rápidas</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>-</span>
            <span className={styles.statLabel}>Total Usuarios</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>-</span>
            <span className={styles.statLabel}>Especialidades</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>-</span>
            <span className={styles.statLabel}>Órdenes Activas</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Admin;
