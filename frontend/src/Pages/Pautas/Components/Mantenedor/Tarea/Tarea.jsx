import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import styles from "./Tarea.module.css";
import checkListStyles from "../CheckList/CheckList.module.css";
import CheckList from "../CheckList/CheckList.jsx";
import { UserContext } from "../../../../../Context/UserContext.jsx";
import { ServerContext } from "../../../../../Context/ServerContext.jsx";
import { useNavigate } from "react-router-dom";

const Tarea = () => {
  const { task } = useContext(UserContext);
  const { finish_task } = useContext(ServerContext);

  // Estado agrupado para mediciones y observaciones
  const [form, setForm] = useState({
    checkbox: false,
    obs: "",
    medicion: "0",
    rangoDesde: "",
    rangoHasta: "",
    valorEsperado: "",
  });
  const [showChecklist, setShowChecklist] = useState(false);
  const [localLoading, setLocalLoading] = useState(true);
  const navigate = useNavigate();
  const navigateToTareas = useCallback(() => {
    navigate("/Cartocor/pautas/detalle");
  }, []);

  const endTask = useCallback(async () => {
    try {
      const response = await finish_task(task.order_id, task.task_id, form);
      if (response.order_status === 2) {
        setShowChecklist(true);
      } else {
        navigateToTareas();
      }
    } catch (error) {
      console.error("Error finishing task:", error);
      // Manejo de errores, como mostrar un mensaje de error al usuario
    }
  }, [task.code, form, finish_task]);
  // Derivar datos de la tarea (evitar efectos secundarios en useMemo)
  const tareaData = useMemo(() => {
    return task && task.data ? task.data : null;
  }, [task]);

  useEffect(() => {
    if (tareaData) {
      setLocalLoading(false);
      // Reset form al cambiar de tarea
      setForm({
        checkbox: false,
        obs: "",
        medicion: "",
        rangoDesde: "",
        rangoHasta: "",
        valorEsperado: tareaData["Valor esperado"] || "",
      });
      setShowChecklist(false);
    }
  }, [tareaData]);

  const handleCheckboxChange = useCallback((checked) => {
    setForm((prev) => ({ ...prev, checkbox: checked }));
  }, []);

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleFinalizar = useCallback(() => {
    endTask();
  }, [endTask]);

  // Ahora sólo el checkbox es obligatorio; el resto de campos son opcionales
  const canFinalize = useMemo(() => form.checkbox, [form.checkbox]);

  if (localLoading) {
    return <div className={styles.loadingContainer}>Cargando tarea...</div>;
  }

  return (
    <>
      {showChecklist && (
        <div className={checkListStyles.popupOverlay}>
          <div className={checkListStyles.popupContent}>
            <button
              className={styles.popupCloseBtn}
              onClick={() => setShowChecklist(false)}
              title="Cerrar"
            >
              ×
            </button>
            <CheckList cancel={() => setShowChecklist(false)} />
          </div>
        </div>
      )}
      {tareaData && Object.keys(tareaData).length > 0 && (
        <div className={styles.tareaContainer}>
          <div className={styles.header}>
            <div>Tarea N°{tareaData["Numero sec oper"]}</div>
            <div>Tiempo Estimado: {tareaData["Hs Estim"]}</div>
          </div>
          <div className={styles.tareaDetails}>
            <span>Taller: {tareaData.Taller}</span>
            <span>Tarea Estándar: {tareaData["Tarea Standard"]}</span>
            <span>Descripción: {tareaData.Descripcion}</span>
            <span>Valor esperado: {tareaData["Valor esperado"]}</span>
          </div>
          <div className={styles.protocoloDetails}>
            <div className={styles.obsTarea}>
              <span>
                Observación de Orden: {task.obs_orden || "sin observación"}
              </span>
            </div>
            <div className={styles.obsTarea}>
              <span>
                Observación de Tarea: {task?.obs || "sin observación"}
              </span>
            </div>
            <div className={styles.protocolo}>
              {task?.protocolo ? (
                <div dangerouslySetInnerHTML={{ __html: task.protocolo }} />
              ) : (
                <em>Sin protocolo disponible</em>
              )}
            </div>
            <div>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={form.checkbox}
                  onChange={(e) => handleCheckboxChange(e.target.checked)}
                />
                He leído el protocolo y la tarea
              </label>
            </div>
            {form.checkbox && (
              <>
                <div className={styles.obsContainer}>
                  <label htmlFor="SaveObs">Observaciones:</label>
                  <textarea
                    id="SaveObs"
                    value={form.obs}
                    onChange={(e) => handleChange("obs", e.target.value)}
                    placeholder="Escriba su observación aquí..."
                    className={styles.textarea}
                  />
                </div>
                <div className={styles.medicionAccepted}>
                  <span className={styles.inlineNotice}>
                    ✅ Protocolo y tarea aceptados
                  </span>
                  <div className={styles.medicionBlock}>
                    <span>Medición Encontrada</span>
                    <select
                      name="medicion"
                      id="medicion"
                      value={form.medicion}
                      onChange={(e) => handleChange("medicion", e.target.value)}
                      className={styles.select}
                    >
                      <option value="0">Seleccionar</option>
                      <option value="1">Si</option>
                      <option value="2">No</option>
                      <option value="3">No Aplica</option>
                    </select>
                    <div className={styles.inputGroup}>
                      <label>Rango desde:</label>
                      <input
                        type="text"
                        value={form.rangoDesde}
                        onChange={(e) =>
                          handleChange("rangoDesde", e.target.value)
                        }
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Rango hasta:</label>
                      <input
                        type="text"
                        value={form.rangoHasta}
                        onChange={(e) =>
                          handleChange("rangoHasta", e.target.value)
                        }
                        className={styles.input}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <button
                    className={styles.finalizarButton}
                    onClick={handleFinalizar}
                    disabled={!canFinalize}
                  >
                    Finalizar Tarea
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Tarea;
