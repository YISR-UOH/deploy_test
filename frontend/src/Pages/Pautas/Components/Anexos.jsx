import { useState, useEffect, memo } from "react";
import styles from "./Anexos.module.css";
import { UserContext } from "../../../Context/UserContext";
import { useContext } from "react";

export const PopupAnexos = memo(function PopupAnexos() {
  const [activeTab, setActiveTab] = useState(0);
  const [content, setContent] = useState("");
  const [anexos, setAnexos] = useState([]);
  const { order, setOrder } = useContext(UserContext);
  useEffect(() => {
    if (order && order.anexos?.length > 0) {
      setAnexos(order.anexos);
    } else {
      setAnexos([]);
    }
    setActiveTab(0);
  }, [order]);
  useEffect(() => {
    if (anexos.length > 0) {
      setContent(
        anexos[activeTab].replace(/\n/g, "<br>") || "No hay anexos disponibles"
      );
    }
  }, [activeTab, anexos]);
  const handleActiveTab = (index) => {
    setActiveTab(index);
    setContent(
      anexos[index].replace(/\n/g, "<br>") || "No hay anexos disponibles"
    );
  };
  return (
    <div className={styles.popupAnexos}>
      <div className={styles.popupHeader}>
        <h2>Anexos de la Pauta</h2>
        <button
          className={styles.closeButton}
          onClick={() => {
            setOrder((prev) => ({ ...prev, anexosActive: false }));
          }}
        >
          X
        </button>
      </div>

      {anexos.length > 0 ? (
        <div className={styles.tabs}>
          <div>Seleccionar un Anexo de Tarea: </div>
          <div className={styles.tabSelect}>
            <select
              value={activeTab}
              onChange={(e) => handleActiveTab(parseInt(e.target.value, 10))}
            >
              {anexos.map((_, index) => (
                <option key={index} value={index}>
                  {`Tarea ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className={styles.tabContent}>
        {anexos[activeTab] ? (
          <p dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <p>No hay anexos disponibles</p>
        )}
      </div>
    </div>
  );
});
