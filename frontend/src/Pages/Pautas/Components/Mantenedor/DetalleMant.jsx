import { useState, useEffect, useContext, useMemo } from "react";
import { UserContext } from "../../../../Context/UserContext";
import { ServerContext } from "../../../../Context/ServerContext";
import styles from "../Detalle.module.css";
import { useNavigate } from "react-router-dom";
import { PopupAnexos } from "../Anexos.jsx";
const DetalleMant = () => {
  const { order, setTask, setOrder } = useContext(UserContext);
  const { getPauta, start_task, getTasks, cancel_order, get_order_with_data } =
    useContext(ServerContext);
  const [pautaDetails, setPautaDetails] = useState(null);
  const [dataDict, setDataDict] = useState({});
  const [dataTask, setDataTask] = useState(null);
  // Conjunto de tareas cuyo status = 2 (completadas o bloqueadas)
  const disabledTasks = useMemo(() => {
    if (!dataTask || !Array.isArray(dataTask)) return new Set();
    return new Set(
      dataTask
        .filter((t) => t && (t.status === 2 || t.status === "2"))
        .map((t) => t.task_number || t.taskNumber || t.id)
        .filter((n) => typeof n === "number")
    );
  }, [dataTask]);
  const navigate = useNavigate();

  const fetchPautas = async () => {
    try {
      const data = await get_order_with_data(order.active);
      console.log("DETALLE MANTENEDOR", data);
      console.log("DETALLE MANTENEDOR", data.orden.data.data.Tareas);
      setDataTask(data.tasks);
      setPautaDetails(data);
      setDataDict(data.orden.data.data);
    } catch (error) {
      console.error("Error al cargar las pautas:", error);
    }
  };
  useEffect(() => {
    fetchPautas();
  }, [order.active]);

  // start_task(orderCode, taskId)
  const fetchTask = async (orderCode, taskId) => {
    try {
      const response = await start_task(orderCode, taskId);
      return response;
    } catch (error) {
      console.error("Error starting task:", error);
      throw error;
    }
  };
  const handleCancelOrder = async () => {
    try {
      const userConfirmed = window.confirm(
        "¿Estás seguro de que deseas cancelar la orden? Las tareas no completadas serán canceladas."
      );
      if (userConfirmed) {
        // pide agregar observaciones
        const obs = window.prompt("Ingrese las motivo de cancelación:");
        if (obs !== null) {
          await cancel_order(pautaDetails.orden.code, obs);
          navigate("/Cartocor/pautas");
        }
      }
    } catch (error) {
      console.error("Error canceling order:", error);
      alert("Error al cancelar la orden. Por favor, inténtalo de nuevo.");
    }
  };

  const formatTime = (time) => {
    if (!time) return "N/A";
    const date = new Date(time);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  if (!pautaDetails) {
    return (
      <div className={styles.loading}>Cargando detalles de la pauta...</div>
    );
  }

  return (
    <div className={styles.container}>
      {order.anexosActive && (
        <div className={styles.popupOverlay}>
          <PopupAnexos />
        </div>
      )}
      <div className={styles.top}>
        <div className={styles.orden}>
          ORDEN: {pautaDetails.orden.code || "No disponible"}
        </div>
        <div className={styles.tarea}>
          TAREAS: {pautaDetails.orden.task_number || "No disponible"}
        </div>
        <div className={styles.timeTotal}>
          Tiempo: {pautaDetails.orden.horas_estimadas || "No disponible"}
        </div>
      </div>
      <div className={styles.detail}>
        <div className={styles.detail1}>
          Descripción: {dataDict.Descripcion || "N/A"}
          <br />
          N° Unidad: {dataDict["N Unidad"] || "N/A"}
          <br />
          Especialidad : {dataDict["Especialidad"] || "N/A"}
          <br />
          Originador : {dataDict["Originador"] || "N/A"}
          <br />
          Linea : {dataDict["Linea"] || "N/A"}
          <br />
          N° Serie : {dataDict["N de Serie"] || "N/A"}
          <br />
          Clase : {dataDict["Clase"] || "N/A"}
          <br />
          Tipo : {dataDict["Tipo"] || "N/A"}
          <br />
          Parte : {dataDict["Parte"] || "N/A"}
          <br />
          Elemento : {dataDict["Elemento"] || "N/A"}
          <br />
          Modo : {dataDict["Modo"] || "N/A"}
          <br />
          Incidencia : {dataDict["Incidencia"] || "N/A"}
          <br />
          Kit de Tareas : {dataDict["Kit de Tareas"] || "N/A"}
          <br />
          Planta : {dataDict["Planta"] || "N/A"}
          <br />
        </div>
        <div className={styles.detail2}>
          Asignado a:{" "}
          {pautaDetails.assigned_to_name !== null
            ? pautaDetails.orden.assigned_to +
              " " +
              pautaDetails.assigned_to_name
            : "N/A"}
          <br />
          Estado: {dataDict["Estado"] || "N/A"}
          <br />F inicial: {formatTime(dataDict["F inicial"]) || "N/A"}
          <br />F Real Ejecucion:{" "}
          {formatTime(dataDict["F Real Ejecucion"]) || "N/A"}
          <br />F Venc.: {formatTime(dataDict["Fecha Venc."]) || "N/A"}
          <br />
          Proximo Venc.: {formatTime(dataDict["Proximo Venc."]) || "N/A"}
          <br />
          Tipo de Servicio: {dataDict["Tipo servici"] || "N/A"}
          <br />
          Frec. Dias: {dataDict["Frec. Dias"] || "N/A"}
          <br />
          Frec. Comb.: {dataDict["Frec. Comb."] || "N/A"}
          <br />
          Frec. Km: {dataDict["Frec. Km"] || "N/A"}
          <br />
          Frec. Horas: {dataDict["Frec. Horas"] || "N/A"}
          <br />
          Ultima Realiz.: {formatTime(dataDict["Ultima Realiz."]) || "N/A"}
          <br />
          Fecha Prox Emision:{" "}
          {formatTime(dataDict["Fecha Prox Emision"]) || "N/A"}
          <br />
          Prioridad : {dataDict["Prioridad"] || "N/A"}
          <br />
        </div>
      </div>
      <div className={styles.additionalInfo}>
        <span>
          Seg. y Medio Ambiente : {dataDict["Seg. y Medio Ambiente"] || "N/A"}
        </span>
        <span>Calidad : {dataDict["Calidad"] || "N/A"}</span>
        <span>Operación : {dataDict["Operacion"] || "N/A"}</span>
        <span>Mantenimiento : {dataDict["Mantenimiento"] || "N/A"}</span>
        <span>Categorización : {dataDict["Categorizacion"] || "N/A"}</span>
        <span>Tipo de Servicio : {dataDict["Tipo de Servicio"] || "N/A"}</span>
      </div>

      <div className={styles.assignedContainer}>
        <div className={styles.assignedBy}>
          <strong>Asignado por:</strong>{" "}
          {pautaDetails.orden.assigned_by +
            " " +
            pautaDetails.assigned_by_name || "Sin Asignar"}
        </div>
        <div className={styles.priorityContainer}>
          <strong>Prioridad:</strong>
          {" " + pautaDetails.orden.prioridad}
        </div>

        <div className={styles.obsContainer}>
          <strong>Observaciones:</strong>
          {pautaDetails.orden.obs_orden !== ""
            ? pautaDetails.orden.obs_orden
            : "Sin observaciones"}
        </div>
        <button
          className={styles.viewButton}
          onClick={() => {
            setOrder({
              ...order,
              anexosActive: true,
              anexos: dataDict.Protocolos || ["No hay anexos disponibles"],
            });
          }}
        >
          Ver Anexos
        </button>
        <button
          className={styles.cancelButton}
          onClick={() => {
            handleCancelOrder();
          }}
        >
          Anular Orden
        </button>
      </div>

      {dataDict.Tareas && (
        <div className={styles.tasksList}>
          <div className={styles.tableContainer}>
            <table className={styles.tasksTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Taller</th>
                  <th>Descripción</th>
                  <th>Hs Estim</th>
                  <th>accion</th>
                </tr>
              </thead>
              <tbody>
                {dataDict.Tareas.map((task, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{task.Taller || "-"}</td>
                    <td>{task.Descripcion || "-"}</td>
                    <td>{task["Hs Estim"] || "-"}</td>
                    <td>
                      <button
                        className={styles.viewButton}
                        onClick={() => {
                          setTask({
                            ...task,
                            order_id: pautaDetails.orden.code,
                            task_id: index + 1,
                            protocolo:
                              dataDict.Protocolos[index].replace(
                                /\n/g,
                                "<br>"
                              ) || "No hay anexos disponibles",
                            data: task,
                            obs:
                              dataTask.find((t) => t.task_number === index + 1)
                                ?.obs_assigned_by || "",
                            obs_orden: pautaDetails.orden.obs_orden || "",
                            detalle_mant: dataDict.Descripcion,
                            name_supervisor:
                              pautaDetails.assigned_by_name || "No Asignado",
                            code_supervisor:
                              pautaDetails.orden.assigned_by || "No Asignado",
                          });
                          fetchTask(pautaDetails.orden.code, index + 1).then(
                            () => {
                              navigate("/Cartocor/pautas/tarea");
                            }
                          );
                        }}
                        disabled={disabledTasks.has(index + 1)}
                      >
                        {disabledTasks.has(index + 1)
                          ? "Finalizada"
                          : dataTask.find((t) => t.task_number === index + 1)
                              ?.status === 1
                          ? "En Progreso"
                          : "Iniciar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleMant;
